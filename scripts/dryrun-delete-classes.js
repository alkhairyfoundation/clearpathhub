require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL });

const CLEANUP = [
  ['students', 'class_id'],
  ['subjects', 'class_id'],
  ['sessions', 'class_id'],
  ['lessons', 'class_id'],
  ['quizzes', 'class_id'],
  ['homework', 'class_id'],
  ['attendance', 'class_id'],
  ['tests', 'class_id'],
  ['question_bank', 'class_id'],
  ['student_classes', 'class_id'],
  ['classes', 'next_class_id'],
];

(async () => {
  const cls = await pool.query(`SELECT id, name FROM classes WHERE name ILIKE 'OLD%' ORDER BY name`);
  console.log('OLD classes to delete:', cls.rows.map(r => r.name).join(', '));

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL statement_timeout = 30000');

    for (const row of cls.rows) {
      console.log(`\n-- deleting ${row.name} (${row.id}) --`);
      let failed = 0;
      for (const [table, col] of CLEANUP) {
        try {
          const r = await client.query(`UPDATE "${table}" SET "${col}" = NULL WHERE "${col}" = $1`, [row.id]);
          console.log(`  OK   UPDATE ${table}.${col} (${r.rowCount} rows)`);
        } catch (e) {
          failed++;
          console.log(`  SKIP UPDATE ${table}.${col} => ${e.message.slice(0, 100)}`);
        }
      }
      try {
        await client.query(`DELETE FROM classes WHERE id = $1`, [row.id]);
        console.log('  OK   DELETE classes');
      } catch (e) {
        failed++;
        console.log('  FAIL DELETE classes =>', e.message);
      }
      console.log(failed === 0 ? '  => all good' : `  => ${failed} failing statements`);
    }

    await client.query('ROLLBACK');
    console.log('\nrolled back — nothing deleted');
  } catch (e) {
    console.error('outer error:', e.message);
    try { await client.query('ROLLBACK'); } catch {}
  } finally {
    client.release();
    await pool.end();
  }
})();