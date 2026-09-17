require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL });
(async () => {
  const cols = await pool.query(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_schema='public' AND table_name='entrance_exams' ORDER BY ordinal_position`
  );
  console.log('entrance_exams columns:');
  for (const c of cols.rows) console.log(`  ${c.column_name}: ${c.data_type}`);
  await pool.end();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });