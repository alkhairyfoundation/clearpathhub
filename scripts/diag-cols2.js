require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL });

(async () => {
  const tables = ['sessions','daily_goals','learning_streaks','badges','review_schedule','announcements','attendance','results','students','homework','classes','mastery_scores','terms','scheme_of_work'];
  const r = await pool.query(
    `SELECT table_name, column_name FROM information_schema.columns
     WHERE table_schema='public' AND table_name = ANY($1)
     ORDER BY table_name, ordinal_position`,
    [tables]
  );
  for (const x of r.rows) console.log(x.table_name + '.' + x.column_name);
  await pool.end();
})().catch((e) => { console.error(e.message); process.exit(1); });