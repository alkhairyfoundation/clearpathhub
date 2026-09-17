require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  const tables = [
    'sessions', 'quizzes', 'tests', 'test_questions', 'test_attempts',
    'homework', 'lessons', 'question_bank', 'mastery_scores', 'results',
    'announcements', 'teacher_tasks', 'teacher_evaluations',
    'report_remarks', 'domain_grades', 'mock_attempts', 'mock_analytics',
    'subject_scales', 'student_classes',
  ];
  for (const t of tables) {
    try {
      const r = await pool.query(
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position`,
        [t]
      );
      if (r.rows.length === 0) {
        console.log(`${t}: EMPTY or does not exist`);
      } else {
        console.log(`${t} (${r.rows.length}): ${r.rows.map(c => c.column_name).join(', ')}`);
      }
    } catch (e) {
      console.log(`${t}: ERROR - ${e.message.split('\n')[0]}`);
    }
  }
  await pool.end();
})().catch(e => { console.error(e); process.exit(1); });