require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL });

(async () => {
  const r = await pool.query(
    `SELECT table_name, column_name FROM information_schema.columns
     WHERE table_schema='public'
       AND table_name IN ('entrance_codes','entrance_exams','entrance_questions','terms')
     ORDER BY table_name, ordinal_position`
  );
  for (const x of r.rows) console.log(x.table_name + '.' + x.column_name);
  await pool.end();
})().catch((e) => { console.error(e.message); process.exit(1); });