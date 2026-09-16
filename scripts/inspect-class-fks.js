require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL });

(async () => {
  const r = await pool.query(
    `SELECT table_name, column_name, is_nullable
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND (column_name = 'class_id' OR (table_name = 'classes' AND column_name = 'next_class_id'))
     ORDER BY table_name`
  );
  for (const x of r.rows) console.log(`${x.table_name}.${x.column_name} nullable=${x.is_nullable}`);

  const rows = await pool.query(
    `SELECT id, name, 
       (SELECT COUNT(*)::int FROM sessions s WHERE s.class_id = c.id) AS sessions,
       (SELECT COUNT(*)::int FROM lessons l WHERE l.class_id = c.id) AS lessons,
       (SELECT COUNT(*)::int FROM quizzes q WHERE q.class_id = c.id) AS quizzes,
       (SELECT COUNT(*)::int FROM homework h WHERE h.class_id = c.id) AS homework,
       (SELECT COUNT(*)::int FROM attendance a WHERE a.class_id = c.id) AS attendance,
       (SELECT COUNT(*)::int FROM tests t WHERE t.class_id = c.id) AS tests,
       (SELECT COUNT(*)::int FROM student_classes sc WHERE sc.class_id = c.id) AS student_classes,
       (SELECT COUNT(*)::int FROM question_bank qb WHERE qb.class_id = c.id) AS question_bank,
       (SELECT COUNT(*)::int FROM teacher_classes tc WHERE tc.class_id = c.id) AS teacher_classes
     FROM classes c WHERE name ILIKE 'OLD%' ORDER BY name`
  );
  console.log('\nOLD classes reference counts:');
  for (const r2 of rows.rows) {
    console.log(`- ${r2.name} (${r2.id.slice(0, 8)}): sessions=${r2.sessions} lessons=${r2.lessons} quizzes=${r2.quizzes} homework=${r2.homework} attendance=${r2.attendance} tests=${r2.tests} student_classes=${r2.student_classes} question_bank=${r2.question_bank} teacher_classes=${r2.teacher_classes}`);
  }

  await pool.end();
})();