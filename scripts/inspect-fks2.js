require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL });
(async () => {
  const parents = ['homework','sessions','lessons','teacher_tasks','teacher_evaluations','staff','subjects','classes','departments','scheme_of_work','teacher_classes'];
  const res = await pool.query(
    `SELECT
       conrelid::regclass::text AS child_table,
       a.attname AS child_col,
       confrelid::regclass::text AS parent_table,
       f.attname AS parent_col,
       confdeltype AS on_delete
     FROM pg_constraint c
     JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
     JOIN pg_attribute f ON f.attrelid = c.confrelid AND f.attnum = ANY(c.confkey)
     WHERE c.contype = 'f' AND c.confrelid::regclass::text IN ('homework','sessions','lessons','teacher_tasks','teacher_evaluations','staff','subjects','classes','departments','scheme_of_work','teacher_classes')
     ORDER BY 3, 1`
  );
  for (const r of res.rows) {
    console.log(`${r.parent_table} <- ${r.child_table}.${r.child_col} (on_delete=${r.on_delete})`);
  }
  await pool.end();
})().catch((e) => { console.error(e); process.exit(1); });