import { NextResponse } from 'next/server';
import { runDbOp, type DbOp, type Filter } from '@/lib/neon-engine';
import { query } from '@/lib/neon';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const PUBLIC_READ_TABLES = new Set(['entrance_codes', 'entrance_questions']);
const PUBLIC_WRITE_TABLES = new Set(['entrance_applications']);
const PUBLIC_RPCS = new Set(['increment_code_usage']);

function buildMirror() {
  return async (table: string, kind: string, payload: any) => {
    const adminClient = createSupabaseAdminClient();

    if (kind === 'insert' || kind === 'upsert') {
      const rows = payload.rows || [];
      if (rows.length === 0) return;
      const sup =
        kind === 'upsert'
          ? adminClient.from(table).upsert(rows, { onConflict: payload.onConflict })
          : adminClient.from(table).insert(rows);
      const { error } = await sup;
      if (error) throw error;
      return;
    }

    if (kind === 'update') {
      let q = adminClient.from(table).update(payload.set);
      q = applyFilters(q, payload.filters);
      const { error } = await q;
      if (error) throw error;
      return;
    }

    if (kind === 'delete') {
      let q = adminClient.from(table).delete();
      q = applyFilters(q, payload.filters);
      const { error } = await q;
      if (error) throw error;
      return;
    }
  };
}

function applyFilters(q: any, filters: Filter[]): any {
  for (const f of filters) {
    if (f.type === 'eq') {
      q = f.val === null || f.val === undefined ? q.is(f.col!, null) : q.eq(f.col!, f.val);
    } else if (f.type === 'neq') {
      q = f.val === null || f.val === undefined ? q.neq(f.col!, null) : q.neq(f.col!, f.val);
    } else if (f.type === 'in') {
      q = q.in(f.col!, Array.isArray(f.val) ? f.val : []);
    } else if (f.type === 'not.in') {
      q = q.not(f.col!, 'in', Array.isArray(f.val) ? f.val : []);
    } else if (f.type === 'is') {
      q = q.is(f.col!, f.val === null ? null : f.val);
    } else if (f.type === 'not') {
      q = f.val === null || f.val === undefined ? q.not(f.col!, 'is', null) : q.neq(f.col!, f.val);
    } else if (f.type === 'gt') {
      q = q.gt(f.col!, f.val);
    } else if (f.type === 'gte') {
      q = q.gte(f.col!, f.val);
    } else if (f.type === 'lte') {
      q = q.lte(f.col!, f.val);
    } else if (f.type === 'lt') {
      q = q.lt(f.col!, f.val);
    }
  }
  return q;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ data: null, error: 'Invalid request body' }, { status: 400 });
    }
    const op: DbOp = body as DbOp;
    if (!op.table || typeof op.table !== 'string') {
      return NextResponse.json({ data: null, error: 'Missing table' }, { status: 400 });
    }

    const sessionCookie = request.headers.get('cookie') || '';
    const authed = sessionCookie.includes('__Secure-next-auth.session-token') || sessionCookie.includes('next-auth.session-token');

    if (!authed) {
      const isPublicRead = op.op === 'read' && PUBLIC_READ_TABLES.has(op.table);
      const isPublicWrite = op.op === 'write' && PUBLIC_WRITE_TABLES.has(op.table) && op.write?.kind === 'insert';
      const isPublicRpc = op.op === 'rpc' && PUBLIC_RPCS.has(op.rpc?.name || '');
      if (!isPublicRead && !isPublicWrite && !isPublicRpc) {
        return NextResponse.json({ data: null, error: 'Not authenticated' }, { status: 401 });
      }
    }

    const result = await runDbOp(op, buildMirror());
    return NextResponse.json({ data: result.data ?? null, count: result.count });
  } catch (error: any) {
    console.error('[/api/db] error:', error);
    return NextResponse.json(
      { data: null, error: error?.message || 'Database operation failed' },
      { status: error?.status ? Number(error.status) : 500 }
    );
  }
}
