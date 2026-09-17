import { query as neonQuery } from '@/lib/neon';

// ============================================================================
// Neon Query Engine
//
// Executes PostgREST-style operations against the Neon database using raw SQL.
// Used by /api/db as the single data-access point for client pages. Reads are
// served directly from Neon; writes are applied to Neon first (source of truth)
// and mirrored to Supabase so nothing is lost.
// ============================================================================

export type FilterOp =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'not.in'
  | 'is'
  | 'like'
  | 'ilike'
  | 'or';

export interface Filter {
  type: FilterOp | 'not';
  col?: string;
  val?: unknown;
  value?: string; // for 'or' parsed filter strings like "col.eq.x,col.is.null"
}

export interface OrderSpec {
  col: string;
  asc: boolean;
}

export interface WriteSpec {
  kind: 'insert' | 'update' | 'delete' | 'upsert';
  data: Record<string, unknown> | Record<string, unknown>[] | null;
  returnEnhanced: boolean;
  onConflict?: string;
}

export interface DbOp {
  table: string;
  op: 'read' | 'write' | 'rpc';
  select?: string;
  filters: Filter[];
  order?: OrderSpec[];
  limit?: number | null;
  offset?: number | null;
  single?: boolean;
  maybeSingle?: boolean;
  count?: 'exact' | 'planned' | 'estimated';
  head?: boolean;
  write?: WriteSpec;
  rpc?: { name: string; args: Record<string, unknown> };
}

interface ColumnInfo {
  name: string;
  dataType: string;
}

const columnsCache = new Map<string, ColumnInfo[]>();

async function getColumns(table: string): Promise<ColumnInfo[]> {
  const cached = columnsCache.get(table);
  if (cached) return cached;
  const rows = await neonQuery(
    `SELECT column_name AS name, data_type AS "dataType"
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [table]
  );
  const cols = rows.map((r: any) => ({ name: r.name, dataType: r.dataType }));
  columnsCache.set(table, cols);
  return cols;
}

async function tableExists(table: string): Promise<boolean> {
  const rows = await neonQuery(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [table]
  );
  return rows.length > 0;
}

function assertColumn(cols: ColumnInfo[], col: string, ctx: string) {
  if (!cols.some((c) => c.name === col)) {
    throw new Error(`Unknown column "${col}" ${ctx}`);
  }
}

const idPattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

// ---------------------------------------------------------------------------
// Select string parsing (supports embeds: alias:table!hint(cols) or alias:table(cols))
// ---------------------------------------------------------------------------

interface Embed {
  alias: string;
  table: string;
  hint: string | null;
  cols: string;
  inner: boolean;
}

interface ParsedSelect {
  rootCols: string[] | null; // null = '*'
  embeds: Embed[];
}

export function parseSelect(select?: string): ParsedSelect {
  if (!select || select.trim() === '') {
    return { rootCols: null, embeds: [] };
  }
  const rootCols: string[] = [];
  const embeds: Embed[] = [];
  const parts = splitTopLevel(select);

  for (const raw of parts) {
    const item = raw.trim();
    if (!item) continue;
    const open = item.indexOf('(');
    if (open === -1) {
      if (item === '*') {
        rootCols.length = 0;
        rootCols.push('*');
      } else {
        rootCols.push(item);
      }
      continue;
    }
    if (!item.endsWith(')')) {
      throw new Error(`Malformed select item: ${item}`);
    }
    const inner = item.slice(open + 1, item.length - 1).trim();
    const head = item.slice(0, open).trim();
    const colon = head.indexOf(':');
    if (colon === -1) {
      throw new Error(`Embedded resource missing alias: ${item}`);
    }
    const aliasRaw = head.slice(0, colon).trim();
    let tableRef = head.slice(colon + 1).trim();
    let innerFlag = false;
    let hint: string | null = null;
    const bang = tableRef.indexOf('!');
    if (bang !== -1) {
      const modifiers = tableRef.slice(bang + 1).trim().split('!').map((s) => s.trim()).filter(Boolean);
      tableRef = tableRef.slice(0, bang).trim();
      innerFlag = modifiers.includes('inner');
      const hintPart = modifiers.find((m) => m !== 'inner' && m !== 'left');
      hint = hintPart || null;
    }
    if (!idPattern.test(tableRef)) {
      throw new Error(`Malformed table reference: ${tableRef}`);
    }
    embeds.push({ alias: aliasRaw, table: tableRef, hint, cols: inner === '' ? '*' : inner, inner: innerFlag });
  }
  return { rootCols: rootCols.length ? rootCols : null, embeds };
}

function splitTopLevel(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of input) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current);
  return parts;
}

// Resolves which column on each side of the embed joins; returns the child
// column (on the embedded table "x") and the parent column (on "t").
async function resolveEmbedDirection(
  parentTable: string,
  parentPk: string,
  embed: Embed
): Promise<{ childCol: string; parentCol: string; many: boolean }> {
  const teCols = await getColumns(embed.table);
  const parentCols = await getColumns(parentTable);

  if (embed.hint) {
    const hint = embed.hint;
    if (teCols.some((c) => c.name === hint)) {
      // Child row carries the FK column → to-many embed
      const childPk = await getPrimaryKey(embed.table);
      return { childCol: hint, parentCol: childPk, many: true };
    }
    if (parentCols.some((c) => c.name === hint)) {
      // Parent row carries the FK column → to-one embed
      const childPk = await getPrimaryKey(embed.table);
      return { childCol: childPk, parentCol: hint, many: false };
    }
    // Supabase also allows the FK constraint name as a hint
    // (e.g. "profiles!payment_uploads_student_id_fkey(...)").
    const conRows = await neonQuery(
      `SELECT conrelid::regclass::text AS t, confrelid::regclass::text AS rt,
              a.attname AS col, f.attname AS refcol
       FROM pg_constraint c
       JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
       JOIN pg_attribute f ON f.attrelid = c.confrelid AND f.attnum = ANY(c.confkey)
       WHERE c.conname = $1 AND c.contype = 'f'`,
      [hint]
    );
    let match = conRows.find((r: any) => r.rt === embed.table && r.t === parentTable);
    if (match) {
      return { childCol: match.col, parentCol: match.refcol, many: true };
    }
    match = conRows.find((r: any) => r.t === embed.table && r.rt === parentTable);
    if (match) {
      return { childCol: match.refcol, parentCol: match.col, many: false };
    }
    throw new Error(`Cannot resolve embed ${embed.alias}: hint "${hint}" is neither a column on "${embed.table}"/"${parentTable}" nor an FK constraint between them`);
  }

  // Infer FK direction from pg_constraint
  const fkRows = await neonQuery(
    `SELECT conrelid::regclass::text AS t, confrelid::regclass::text AS rt,
            a.attname AS col, f.attname AS refcol
     FROM pg_constraint c
     JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
     JOIN pg_attribute f ON f.attrelid = c.confrelid AND f.attnum = ANY(c.confkey)
     WHERE c.contype = 'f'
       AND c.conrelid = $1::regclass::oid
       AND c.confrelid = $2::regclass::oid`,
    [embed.table, parentTable]
  );
  if (fkRows.length > 0) {
    return { childCol: fkRows[0].col, parentCol: fkRows[0].refcol, many: true };
  }
  const reverseRows = await neonQuery(
    `SELECT conrelid::regclass::text AS t, confrelid::regclass::text AS rt,
            a.attname AS col, f.attname AS refcol
     FROM pg_constraint c
     JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
     JOIN pg_attribute f ON f.attrelid = c.confrelid AND f.attnum = ANY(c.confkey)
     WHERE c.contype = 'f'
       AND c.conrelid = $1::regclass::oid
       AND c.confrelid = $2::regclass::oid`,
    [parentTable, embed.table]
  );
  if (reverseRows.length > 0) {
    return { childCol: reverseRows[0].refcol, parentCol: reverseRows[0].col, many: false };
  }
  throw new Error(`Cannot infer relationship between "${parentTable}" and "${embed.table}"`);
}

const pkCache = new Map<string, string>();

async function getPrimaryKey(table: string): Promise<string> {
  const cached = pkCache.get(table);
  if (cached) return cached;
  const rows = await neonQuery(
    `SELECT a.attname AS col
     FROM pg_index i
     CROSS JOIN LATERAL unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
     JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
     WHERE i.indrelid = $1::regclass::oid AND i.indisprimary AND k.attnum <> 0
     ORDER BY k.ord`,
    [table]
  );
  const pk = rows.length > 0 ? rows[0].col : 'id';
  pkCache.set(table, pk);
  return pk;
}

// ---------------------------------------------------------------------------
// Value handling
// ---------------------------------------------------------------------------

function toDbValue(v: unknown): unknown {
  if (v === null || v === undefined) return v;
  if (typeof v === 'boolean' || typeof v === 'number' || typeof v === 'string') return v;
  if (v instanceof Date) return v.toISOString();
  return JSON.stringify(v);
}

// ---------------------------------------------------------------------------
// Filter SQL generation
// ---------------------------------------------------------------------------

interface OrCondition {
  col: string;
  sql: string;
  value: unknown;
  hasValue: boolean;
}

function orConditionsParser(value: string): OrCondition[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const m = part.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\.(not\.in|in|is|eq|neq|gt|gte|lt|lte|like|ilike)(\..+)?$/);
      if (!m) throw new Error(`Malformed or() condition: ${part}`);
      return m;
    })
    .map((m) => {
      const col = m[1];
      const op = m[2];
      let rawVal = (m[3] ? m[3].slice(1) : '');
      if (op === 'is') {
        if (rawVal === 'null') return { col, sql: `"${col}" IS NULL`, value: null as unknown, hasValue: false };
        if (rawVal === 'not.null') return { col, sql: `"${col}" IS NOT NULL`, value: null as unknown, hasValue: false };
        return { col, sql: `"${col}" = $`, value: rawVal, hasValue: true };
      }
      const opMap: Record<string, string> = {
        eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=', like: 'LIKE', ilike: 'ILIKE',
      };
      if (op === 'in') {
        const items = rawVal.split('.').filter(Boolean).map((s) => s.trim());
        return { col, sql: `"${col}" = ANY($)`, value: items, hasValue: true };
      }
      if (!opMap[op]) throw new Error(`Unsupported or() operator: ${op}`);
      return { col, sql: `"${col}" ${opMap[op]} $`, value: rawVal, hasValue: true };
    });
}

async function buildWhere(
  table: string,
  filters: Filter[],
  cols: ColumnInfo[]
): Promise<{ sql: string; values: unknown[] }> {
  const conds: string[] = [];
  const values: unknown[] = [];

  for (const f of filters) {
    if (f.type === 'or') {
      const parsed = orConditionsParser(f.value || '');
      const orConds: string[] = [];
      for (const pc of parsed) {
        assertColumn(cols, pc.col, `in filter`);
        if (pc.hasValue) {
          orConds.push(pc.sql.replace('$', `$${values.length + 1}`));
          values.push(toDbValue(pc.value));
        } else {
          orConds.push(pc.sql);
        }
      }
      conds.push(`(${orConds.join(' OR ')})`);
      continue;
    }

    const col = f.col!;
    assertColumn(cols, col, `in filter`);
    const colSql = `"${col}"`;

    switch (f.type) {
      case 'eq':
        if (f.val === null || f.val === undefined) {
          conds.push(`${colSql} IS NULL`);
        } else {
          conds.push(`${colSql} = $${values.length + 1}`);
          values.push(toDbValue(f.val));
        }
        break;
      case 'neq':
        if (f.val === null || f.val === undefined) {
          conds.push(`${colSql} IS NOT NULL`);
        } else {
          conds.push(`${colSql} <> $${values.length + 1}`);
          values.push(toDbValue(f.val));
        }
        break;
      case 'not':
        if (f.val === null || f.val === undefined) {
          conds.push(`${colSql} IS NOT NULL`);
        } else {
          conds.push(`${colSql} <> $${values.length + 1}`);
          values.push(toDbValue(f.val));
        }
        break;
      case 'gt': conds.push(`${colSql} > $${values.length + 1}`); values.push(toDbValue(f.val)); break;
      case 'gte': conds.push(`${colSql} >= $${values.length + 1}`); values.push(toDbValue(f.val)); break;
      case 'lt': conds.push(`${colSql} < $${values.length + 1}`); values.push(toDbValue(f.val)); break;
      case 'lte': conds.push(`${colSql} <= $${values.length + 1}`); values.push(toDbValue(f.val)); break;
      case 'like': conds.push(`${colSql} LIKE $${values.length + 1}`); values.push(toDbValue(f.val)); break;
      case 'ilike': conds.push(`${colSql} ILIKE $${values.length + 1}`); values.push(toDbValue(f.val)); break;
      case 'in': {
        const arr = Array.isArray(f.val) ? f.val : [];
        if (arr.length === 0) {
          conds.push('1 = 0');
        } else {
          conds.push(`${colSql}::text = ANY($${values.length + 1}::text[])`);
          values.push(arr.map((x) => String(x)));
        }
        break;
      }
      case 'not.in': {
        const arr = Array.isArray(f.val) ? f.val : [];
        if (arr.length === 0) {
          conds.push('1 = 1');
        } else {
          conds.push(`NOT (${colSql}::text = ANY($${values.length + 1}::text[]))`);
          values.push(arr.map((x) => String(x)));
        }
        break;
      }
      case 'is':
        conds.push(f.val === null ? `${colSql} IS NULL` : `${colSql} IS NOT NULL`);
        break;
    }
  }

  const sql = conds.length > 0 ? `WHERE ${conds.join(' AND ')}` : '';
  return { sql, values };
}

// ---------------------------------------------------------------------------
// Read execution
// ---------------------------------------------------------------------------

async function executeRead(op: DbOp): Promise<{ data: unknown; count?: number }> {
  const table = op.table;
  if (!(await tableExists(table))) {
    throw new Error(`Table "${table}" does not exist`);
  }
  const cols = await getColumns(table);
  const parsed = parseSelect(op.select);

  const { sql: whereSql, values } = await buildWhere(table, op.filters || [], cols);

  // Count query first if requested (matches PostgREST count + head behavior)
  let count: number | undefined;
  if (op.count || op.head) {
    const countRows = await neonQuery(
      `SELECT COUNT(*)::int AS total FROM "${table}" ${whereSql}`,
      values
    );
    count = countRows[0]?.total ?? 0;
    if (op.head) {
      return { data: [], count };
    }
  }

  // Build order by
  const orderSql = (op.order || [])
    .map((o) => {
      assertColumn(cols, o.col, `in order`);
      return `"${o.col}" ${o.asc ? 'ASC' : 'DESC'}`;
    })
    .join(', ');

  // Build root select list
  let rootList = '"t".*';
  if (parsed.rootCols && parsed.rootCols.length > 0 && !parsed.rootCols.includes('*')) {
    rootList = parsed.rootCols
      .map((c) => {
        assertColumn(cols, c, `in select`);
        return `"t"."${c}"`;
      })
      .join(', ');
  }

  const embedSqls: string[] = [];
  const innerConds: string[] = [];
  for (const embed of parsed.embeds) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(embed.alias)) throw new Error(`Bad alias ${embed.alias}`);
    const teCols = await getColumns(embed.table);
    const embCols = embed.cols === '*'
      ? '"x".*'
      : embed.cols.split(',').map((c) => c.trim()).filter(Boolean).map((c) => {
          if (!teCols.some((x) => x.name === c)) throw new Error(`Unknown column "${c}" on "${embed.table}" for embed "${embed.alias}"`);
          return `"x"."${c}"`;
        }).join(', ');

    const dir = await resolveEmbedDirection(table, await getPrimaryKey(table), embed);
    const joinCond = `"x"."${dir.childCol}" = "t"."${dir.parentCol}"`;
    if (embed.inner) innerConds.push(`EXISTS (SELECT 1 FROM "${embed.table}" AS "x" WHERE ${joinCond})`);
    if (dir.many) {
      embedSqls.push(
        `COALESCE((SELECT jsonb_agg("sq") FROM (SELECT ${embCols} FROM "${embed.table}" AS "x" WHERE ${joinCond}) AS "sq"), '[]'::jsonb) AS "${embed.alias}"`
      );
    } else {
      embedSqls.push(
        `(SELECT to_jsonb("sq") FROM (SELECT ${embCols} FROM "${embed.table}" AS "x" WHERE ${joinCond} LIMIT 1) AS "sq") AS "${embed.alias}"`
      );
    }
  }

  const selectList = embedSqls.length > 0 ? `${rootList}, ${embedSqls.join(', ')}` : rootList;

  const whereFull = innerConds.length > 0
    ? (whereSql ? `${whereSql} AND ${innerConds.join(' AND ')}` : `WHERE ${innerConds.join(' AND ')}`)
    : whereSql;

  let sql = `SELECT ${selectList} FROM "${table}" AS "t" ${whereFull}`;
  if (orderSql) sql += ` ORDER BY ${orderSql}`;
  if (op.limit != null) sql += ` LIMIT ${Math.max(0, Math.floor(op.limit))}`;
  if (op.offset != null) sql += ` OFFSET ${Math.max(0, Math.floor(op.offset))}`;

  let rows = await neonQuery(sql, values);

  if (op.single || op.maybeSingle) {
    if (rows.length > 1) {
      if (op.single) {
        const err = new Error('More than one row matched. Use maybeSingle() for possibly multiple rows.');
        (err as any).status = 406;
        throw err;
      }
      rows = rows.slice(0, 1);
    }
    const data = rows.length > 0 ? rows[0] : null;
    return { data, count };
  }

  return { data: rows, count };
}

// ---------------------------------------------------------------------------
// Write execution (Neon primary, then Supabase mirror)
// ---------------------------------------------------------------------------

function isScalar(v: unknown): boolean {
  return v === null || v === undefined || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';
}

async function executeWrite(
  op: DbOp,
  mirror: (table: string, kind: string, payload: any) => Promise<void>
): Promise<{ data: unknown }> {
  const table = op.table;
  if (!(await tableExists(table))) {
    throw new Error(`Table "${table}" does not exist`);
  }
  const cols = await getColumns(table);
  const w = op.write!;
  let rows: any[] = [];

  if (w.kind === 'insert' || w.kind === 'upsert') {
    const dataArr = Array.isArray(w.data) ? w.data : [w.data];
    if (dataArr.length === 0) throw new Error('Empty data');

    const allKeys = Array.from(new Set(dataArr.flatMap((d) => Object.keys(d || {}))));
    for (const k of allKeys) assertColumn(cols, k, `in insert data`);
    const colType = new Map(cols.map((c) => [c.name, c.dataType]));
    const jsonbCols = new Set(allKeys.filter((k) => colType.get(k) === 'jsonb'));
    const colList = allKeys.map((k) => `"${k}"`).join(', ');

    const valuePlaceholders: string[] = [];
    const flatValues: unknown[] = [];
    for (const row of dataArr) {
      const rowVals = allKeys.map((k) => {
        const v = (row ?? {})[k];
        if (isScalar(v)) return v ?? null;
        if (jsonbCols.has(k)) return typeof v === 'string' ? v : JSON.stringify(v);
        if (Array.isArray(v)) return v;
        return toDbValue(v);
      });
      const ph = allKeys
        .map((k, i) => `$${flatValues.length + i + 1}${jsonbCols.has(k) ? '::jsonb' : ''}`)
        .join(', ');
      valuePlaceholders.push(`(${ph})`);
      flatValues.push(...rowVals);
    }

    let sql: string;
    if (w.kind === 'upsert') {
      const conflictCols = w.onConflict
        ? w.onConflict.split(',').map((c) => c.trim()).filter(Boolean).map((c) => { assertColumn(cols, c, `in onConflict`); return `"${c}"`; }).join(', ')
        : '';
      if (conflictCols !== '') {
        const updateCols = allKeys
          .filter((k) => !w.onConflict!.includes(k))
          .map((k) => `"${k}" = EXCLUDED."${k}"`)
          .join(', ');
        const onConflictClause = updateCols.trim() !== ''
          ? `ON CONFLICT (${conflictCols}) DO UPDATE SET ${updateCols}`
          : `ON CONFLICT (${conflictCols}) DO NOTHING`;
        sql = `INSERT INTO "${table}" (${colList}) VALUES ${valuePlaceholders.join(', ')}
               ${onConflictClause}
               RETURNING *`;
      } else {
        // No explicit conflict column: prefer the primary key (Supabase parity),
        // otherwise fall back to a bare ON CONFLICT DO NOTHING.
        const pk = await getPrimaryKey(table);
        const hasPkInData = allKeys.includes(pk);
        if (hasPkInData) {
          const updateCols = allKeys
            .filter((k) => k !== pk)
            .map((k) => `"${k}" = EXCLUDED."${k}"`)
            .join(', ');
          const onConflictClause = updateCols.trim() !== ''
            ? `ON CONFLICT ("${pk}") DO UPDATE SET ${updateCols}`
            : `ON CONFLICT ("${pk}") DO NOTHING`;
          sql = `INSERT INTO "${table}" (${colList}) VALUES ${valuePlaceholders.join(', ')}
                 ${onConflictClause}
                 RETURNING *`;
        } else {
          sql = `INSERT INTO "${table}" (${colList}) VALUES ${valuePlaceholders.join(', ')}
                 ON CONFLICT DO NOTHING
                 RETURNING *`;
        }
      }
    } else {
      sql = `INSERT INTO "${table}" (${colList}) VALUES ${valuePlaceholders.join(', ')} RETURNING *`;
    }

    rows = await neonQuery(sql, flatValues);
    if (w.returnEnhanced && rows.length === 0) rows = [];

    try {
      await mirror(table, w.kind === 'upsert' ? 'upsert' : 'insert', { rows: rows.length ? rows : dataArr, onConflict: w.onConflict });
    } catch (e) {
      console.error(`[db] Supabase mirror insert failed for ${table}:`, e);
    }
  } else if (w.kind === 'update') {
    const data = (w.data || {}) as Record<string, unknown>;
    const setKeys = Object.keys(data);
    if (setKeys.length === 0) throw new Error('Nothing to update');
    for (const k of setKeys) assertColumn(cols, k, `in update data`);
    const { sql: whereSql, values } = await buildWhere(table, op.filters || [], cols);

    const colType = new Map(cols.map((c) => [c.name, c.dataType]));
    const jsonbCols = new Set(setKeys.filter((k) => colType.get(k) === 'jsonb'));

    const setParts = setKeys.map((k, i) => `"${k}" = $${values.length + i + 1}${jsonbCols.has(k) ? '::jsonb' : ''}`);
    const setVals = setKeys.map((k) => {
      const v = data[k];
      if (isScalar(v)) return v ?? null;
      if (jsonbCols.has(k)) return typeof v === 'string' ? v : JSON.stringify(v);
      if (Array.isArray(v)) return v;
      return toDbValue(v);
    });
    const sql = `UPDATE "${table}" SET ${setParts.join(', ')} ${whereSql} RETURNING *`;

    rows = await neonQuery(sql, [...values, ...setVals]);
    try {
      await mirror(table, 'update', { set: data, filters: op.filters || [] });
    } catch (e) {
      console.error(`[db] Supabase mirror update failed for ${table}:`, e);
    }
  } else if (w.kind === 'delete') {
    const { sql: whereSql, values } = await buildWhere(table, op.filters || [], cols);
    if (!whereSql) throw new Error('Delete requires at least one filter');
    const sql = `DELETE FROM "${table}" ${whereSql} RETURNING *`;
    rows = await neonQuery(sql, values);
    try {
      await mirror(table, 'delete', { filters: op.filters || [] });
    } catch (e) {
      console.error(`[db] Supabase mirror delete failed for ${table}:`, e);
    }
  }

  const data = w.returnEnhanced
    ? (op.single || op.maybeSingle ? rows[0] || null : rows)
    : null;
  return { data };
}

// ---------------------------------------------------------------------------
// RPC execution (calls Postgres function returning rows)
// ---------------------------------------------------------------------------

async function executeRpc(
  name: string,
  args: Record<string, unknown>
): Promise<{ data: unknown }> {
  if (!idPattern.test(name)) {
    throw new Error(`Invalid function name "${name}"`);
  }
  const keys = Object.keys(args || {});
  const values = keys.map((k) => toDbValue(args[k]));
  const argSql = keys
    .map((k, i) => {
      if (!idPattern.test(k)) throw new Error(`Invalid argument name "${k}"`);
      return `"${k}" => $${i + 1}`;
    })
    .join(', ');
  const sql = `SELECT * FROM "${name}"(${argSql})`;
  const rows = await neonQuery(sql, values);
  return { data: rows.length === 1 ? rows[0] : rows };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export async function runDbOp(
  op: DbOp,
  mirror?: (table: string, kind: string, payload: any) => Promise<void>
): Promise<{ data: unknown; count?: number }> {
  if (!op || !op.table) throw new Error('Missing table');
  if (op.op === 'read') {
    return executeRead(op);
  }
  if (op.op === 'write' && op.write) {
    return executeWrite(op, mirror || (async () => {}));
  }
  if (op.op === 'rpc' && op.rpc) {
    return executeRpc(op.rpc.name, op.rpc.args || {});
  }
  throw new Error('Unsupported operation');
}