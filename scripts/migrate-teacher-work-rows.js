require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function runSqlFile() {
  const file = path.join(__dirname, 'ensure-neon-teacher-work-tables.sql');
  const sql = fs.readFileSync(file, 'utf8');
  await pool.query(sql);
  console.log('Applied ensure-neon-teacher-work-tables.sql');
}

async function fetchSupabaseRows(table) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  });
  if (!res.ok) throw new Error(`Failed to read ${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function validIds(ids) {
  const uniq = [...new Set(ids.filter(Boolean))];
  if (uniq.length === 0) return new Set();
  const res = await pool.query('SELECT id FROM profiles WHERE id = ANY($1::uuid[])', [uniq]);
  return new Set(res.rows.map((r) => r.id));
}

async function migrateRows(table, rows, validProfiles) {
  if (!rows.length) { console.log(`${table}: 0 rows to migrate`); return; }
  let inserted = 0;
  const skipped = [];
  for (const row of rows) {
    const safe = { ...row };
    if (safe.teacher_id && !validProfiles.has(safe.teacher_id)) {
      skipped.push(`${safe.id} (teacher_id ${safe.teacher_id} missing from profiles)`);
      safe.teacher_id = null;
    }
    if (safe.created_by && !validProfiles.has(safe.created_by)) safe.created_by = null;
    if (safe.evaluated_by && !validProfiles.has(safe.evaluated_by)) safe.evaluated_by = null;

    const cols = Object.keys(safe);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
    const values = cols.map((c) => safe[c] ?? null);
    const updateCols = cols.filter((c) => c !== 'id');
    const updateSql = updateCols.map((c) => `"${c}" = EXCLUDED."${c}"`).join(', ');
    await pool.query(
      `INSERT INTO ${table} (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders})
       ON CONFLICT (id) DO UPDATE SET ${updateSql}`,
      values
    );
    inserted++;
  }
  console.log(`${table}: ${inserted} migrated`);
  for (const s of skipped) console.log(`  SKIPPED FK: ${s}`);
}

async function main() {
  await runSqlFile();

  const allProfiles = new Set(
    (await pool.query('SELECT id FROM profiles')).rows.map((r) => r.id)
  );
  console.log(`Neon profiles count: ${allProfiles.size}`);

  const tasks = await fetchSupabaseRows('teacher_tasks');
  const evals = await fetchSupabaseRows('teacher_evaluations');
  console.log(`Supabase teacher_tasks: ${tasks.length}, teacher_evaluations: ${evals.length}`);

  await migrateRows('teacher_tasks', tasks, allProfiles);
  await migrateRows('teacher_evaluations', evals, allProfiles);

  const checkTasks = await pool.query('SELECT id, teacher_id, title, status, admin_grade FROM teacher_tasks');
  const checkEvals = await pool.query('SELECT id, teacher_id, title, status FROM teacher_evaluations');
  console.log(`Neon teacher_tasks now: ${checkTasks.rowCount}`);
  console.log(`Neon teacher_evaluations now: ${checkEvals.rowCount}`);
}

main()
  .then(() => pool.end())
  .catch((e) => { console.error(e); pool.end(); process.exit(1); });