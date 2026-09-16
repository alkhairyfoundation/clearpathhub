require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const MODE = process.argv.includes('--migrate') ? 'migrate' : 'compare';
const BACKUP = process.argv.includes('--no-backup') ? null : 'backup-entrance-supabase.json';

const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL });

// Insert order: exams -> codes -> questions -> applications -> analytics.
// (codes references exams; questions references exams; applications references exams+codes;
//  analytics references applications)
const TABLES = [
  { name: 'entrance_exams', order: 1 },
  { name: 'entrance_questions', order: 2 },
  { name: 'entrance_codes', order: 2 },
  { name: 'entrance_applications', order: 3 },
  { name: 'student_analytics', order: 4 },
];

async function getNeonColumns(table) {
  const rows = await pool.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 AND table_schema = 'public'`,
    [table]
  );
  const map = {};
  for (const r of rows.rows) map[r.column_name] = r.data_type;
  return map;
}

async function fetchNeonIds(table) {
  const res = await pool.query(`SELECT id FROM ${table}`);
  return new Set(res.rows.map((r) => r.id));
}

async function fetchSupabaseRows(table) {
  const all = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Supabase fetch ${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

async function tableExists(table) {
  const res = await pool.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = $1 AND table_schema = 'public'`,
    [table]
  );
  return res.rows.length > 0;
}

function serializeValue(val, dataType) {
  if (val === null || val === undefined) return null;
  if (dataType === 'jsonb' || dataType === 'json') return JSON.stringify(val);
  if (dataType === 'ARRAY' && Array.isArray(val)) return val;
  if (val instanceof Date) return val.toISOString();
  return val;
}

async function insertRow(table, neonColumns, row) {
  const cols = Object.keys(neonColumns);
  const values = cols.map((c) => serializeValue(row[c], neonColumns[c]));
  const colList = cols.map((c) => `"${c}"`).join(', ');
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
  const sql = `INSERT INTO ${table} (${colList}) VALUES (${placeholders})`;
  await pool.query(sql, values);
}

async function main() {
  const report = [];
  const missingByTable = {};
  const backup = {};

  for (const { name } of TABLES) {
    if (!(await tableExists(name))) {
      console.log(`SKIP ${name}: table not in Neon`);
      continue;
    }
    const [neonIds, supabaseRows] = await Promise.all([fetchNeonIds(name), fetchSupabaseRows(name)]);
    const missing = supabaseRows.filter((row) => row.id && !neonIds.has(row.id));
    missingByTable[name] = missing;
    backup[name] = missing;
    report.push({
      table: name,
      supabase: supabaseRows.length,
      neon: neonIds.size,
      missing: missing.length,
    });
    console.log(
      `${name}: supabase=${supabaseRows.length} neon=${neonIds.size} missingInNeon=${missing.length}`
    );
  }

  if (MODE === 'compare') {
    if (BACKUP) {
      fs.writeFileSync(BACKUP, JSON.stringify(backup, null, 2));
      console.log(`\nBackup written to ${BACKUP}. Inspect it, then run with --migrate.`);
    } else {
      console.log('\nComparison done.');
    }
    return;
  }

  // Insert in dependency order
  const sorted = [...TABLES].sort((a, b) => a.order - b.order);
  let totalInserted = 0;

  for (const { name } of sorted) {
    const missing = missingByTable[name] || [];
    if (missing.length === 0) continue;
    const neonCols = await getNeonColumns(name);
    let inserted = 0;
    for (const row of missing) {
      try {
        await insertRow(name, neonCols, row);
        inserted++;
      } catch (err) {
        console.error(`  FAIL ${name} ${row.id}: ${err.message}`);
      }
    }
    totalInserted += inserted;
    console.log(`${name}: inserted ${inserted}/${missing.length} rows`);
  }

  console.log(`\nMigration complete. Total inserted into Neon: ${totalInserted}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});