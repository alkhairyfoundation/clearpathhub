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
  if (cls.rows.length === 0) {
    console.log('No OLD classes found.');
    await pool.end();
    return;
  }
  console.log('Deleting:', cls.rows.map(r => r.name).join(', '));

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const row of cls.rows) {
      for (const [table, col] of CLEANUP) {
        await client.query(`UPDATE "${table}" SET "${col}" = NULL WHERE "${col}" = $1`, [row.id]);
      }
      const del = await client.query(`DELETE FROM classes WHERE id = $1`, [row.id]);
      console.log(`- ${row.name}: deleted (${del.rowCount} row)`);
    }
    await client.query('COMMIT');
    console.log('COMMITTED');
  } catch (e) {
    console.error('error, rolling back:', e.message);
    try { await client.query('ROLLBACK'); } catch {}
  } finally {
    client.release();
    await pool.end();
  }
})();