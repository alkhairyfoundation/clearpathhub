require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL });

(async () => {
  // Query 1: fetchData — exams list with embedded questions + applications
  const q1 = `
    SELECT "t".*,
      COALESCE((SELECT jsonb_agg("sq") FROM (SELECT "x".*
        FROM "entrance_questions" AS "x" WHERE "x"."exam_id" = "t"."id") AS "sq"), '[]'::jsonb) AS "questions",
      COALESCE((SELECT jsonb_agg("sq") FROM (SELECT "x".*
        FROM "entrance_applications" AS "x" WHERE "x"."exam_id" = "t"."id") AS "sq"), '[]'::jsonb) AS "applications"
    FROM "entrance_exams" AS "t"
    ORDER BY "exam_date" ASC
  `;
  try {
    const r1 = await pool.query(q1);
    console.log('[fetchData] exams returned:', r1.rowCount);
    if (r1.rowCount > 0) {
      const ex = r1.rows[0];
      console.log('  first exam:', ex.title, '| questions:', ex.questions?.length ?? 'null', '| apps:', ex.applications?.length ?? 'null');
    }
  } catch (e) {
    console.error('[fetchData] FAILED:', e.message.slice(0, 500));
  }

  // Query 2: fetchAnalytics — analytics with !inner embed
  const q2 = `
    SELECT "t".*,
      (SELECT to_jsonb("sq") FROM (SELECT "x"."first_name", "x"."last_name"
        FROM "entrance_applications" AS "x" WHERE "x"."id" = "t"."application_id" LIMIT 1) AS "sq") AS "entrance_applications"
    FROM "student_analytics" AS "t"
    WHERE EXISTS (SELECT 1 FROM "entrance_applications" AS "x" WHERE "x"."id" = "t"."application_id")
    ORDER BY "generated_at" DESC
  `;
  try {
    const r2 = await pool.query(q2);
    console.log('\n[fetchAnalytics] analytics returned:', r2.rowCount);
    if (r2.rowCount > 0) {
      const row = r2.rows[0];
      console.log('  first row score:', row.score, 'type:', typeof row.score);
      console.log('  entrance_applications:', JSON.stringify(row.entrance_applications).slice(0, 100));
    }
  } catch (e) {
    console.error('[fetchAnalytics] FAILED:', e.message.slice(0, 500));
  }

  await pool.end();
})();
