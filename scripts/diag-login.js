require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL });

(async () => {
  try {
    const tables = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' ORDER BY table_name`
    );
    console.log('TABLES:');
    console.log(tables.rows.map((r) => r.table_name).join('\n'));

    const cols = await pool.query(
      `SELECT table_name, column_name FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name IN ('profiles','students','staff','classes','teacher_classes','subjects','sessions','homework','quizzes','announcements','results','mastery_scores','comments','scheme_of_work','terms','accountant','departments')
       ORDER BY table_name, ordinal_position`
    );
    console.log('\nCOLUMNS:');
    for (const r of cols.rows) console.log(`${r.table_name}.${r.column_name}`);
  } catch (e) {
    console.error('ERROR', e.message);
  } finally {
    await pool.end();
  }
})();