require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } });
const tables = ['practice_sessions', 'practice_attempts', 'daily_goals', 'learning_streaks', 'badges', 'review_schedule', 'mastery_scores', 'question_bank'];
(async () => {
  for (const t of tables) {
    const cols = await pool.query(
      `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
      [t]
    );
    if (cols.rows.length === 0) { console.log(`\n=== ${t}: TABLE MISSING ===`); continue; }
    console.log(`\n=== ${t} ===`);
    for (const c of cols.rows) console.log(`  ${c.column_name}  ${c.data_type}  null=${c.is_nullable}  def=${c.column_default ?? ''}`);
  }
  await pool.end();
})();