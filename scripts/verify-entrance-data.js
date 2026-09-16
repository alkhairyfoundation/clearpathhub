require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL });

(async () => {
  const saCols = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='student_analytics' ORDER BY ordinal_position`
  );
  console.log('student_analytics columns:', saCols.rows.map(r => r.column_name).join(', '));

  console.log('\n-- simulate admin: entrance_exams with questions & applications embeds --');
  const admin = await pool.query(
    `SELECT COUNT(*)::int AS c FROM entrance_exams e`
  );
  console.log('exams returned:', admin.rows[0].c);

  const appsWithExam = await pool.query(
    `SELECT a.id, to_jsonb(e.*) AS exam
     FROM entrance_applications a
     LEFT JOIN entrance_exams e ON e.id = a.exam_id
     ORDER BY a.created_at DESC`
  );
  console.log('applications with exam embed:', appsWithExam.rowCount, '| null exam count:',
    appsWithExam.rows.filter(r => r.exam === null).length);

  const codesWithExam = await pool.query(
    `SELECT c.id, c.code, c.used_count, c.max_uses, c.is_active, to_jsonb(e.*) AS exam
     FROM entrance_codes c
     LEFT JOIN entrance_exams e ON e.id = c.exam_id
     ORDER BY c.created_at DESC`
  );
  console.log('codes with exam embed:', codesWithExam.rowCount, '| null exam count:',
    codesWithExam.rows.filter(r => r.exam === null).length);

  const examEmbeds = await pool.query(
    `SELECT e.title,
       (SELECT jsonb_agg(sq) FROM (SELECT q.id, q.question FROM entrance_questions q WHERE q.exam_id = e.id) sq) AS questions,
       (SELECT jsonb_agg(sq) FROM (SELECT a.id, a.first_name, a.last_name FROM entrance_applications a WHERE a.exam_id = e.id) sq) AS applications
     FROM entrance_exams e ORDER BY e.exam_date NULLS LAST`
  );
  console.log('\nper-exam embed counts:');
  for (const r of examEmbeds.rows) {
    console.log(`- ${r.title}: questions=${(r.questions || []).length}, applications=${(r.applications || []).length}`);
  }

  await pool.end();
})();