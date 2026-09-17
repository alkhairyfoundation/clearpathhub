require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL });

(async () => {
  const fks = await pool.query(
    `SELECT c.conname, tn.relname AS from_table, tc.attname AS from_col,
            rt.relname AS ref_table, rc.attname AS ref_col
     FROM pg_constraint c
     JOIN pg_class tn ON tn.oid = c.conrelid
     JOIN pg_class rt ON rt.oid = c.confrelid
     JOIN pg_attribute tc ON tc.attrelid = c.conrelid AND tc.attnum = ANY(c.conkey)
     JOIN pg_attribute rc ON rc.attrelid = c.confrelid AND rc.attnum = ANY(c.confkey)
     WHERE c.contype = 'f' AND tn.relname IN ('student_analytics','entrance_applications','entrance_codes','entrance_questions','entrance_exams')
     ORDER BY tn.relname`
  );
  console.log('FKs among entrance-related tables:');
  for (const r of fks.rows) console.log(`- ${r.from_table}.${r.from_col} -> ${r.ref_table}.${r.ref_col}  (${r.conname})`);
  if (fks.rows.length === 0) console.log('  (none)');

  const appCols = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='entrance_applications' ORDER BY ordinal_position`
  );
  console.log('\nentrance_applications columns:', appCols.rows.map(r => r.column_name).join(', '));

  const nullApps = await pool.query(
    `SELECT COUNT(*)::int AS n FROM student_analytics sa
     LEFT JOIN entrance_applications a ON a.id = sa.application_id WHERE a.id IS NULL`
  );
  console.log('\nstudent_analytics rows with dangling application_id:', nullApps.rows[0].n);

  const malformed = await pool.query(
    `SELECT COUNT(*)::int AS n FROM student_analytics WHERE application_id IS NULL OR application_id = ''`
  );
  console.log('student_analytics with null/empty application_id:', malformed.rows[0].n);

  await pool.end();
})();