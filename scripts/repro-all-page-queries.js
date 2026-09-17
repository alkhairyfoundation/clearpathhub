require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL });

const queries = [
  {
    name: 'exams (fetchData)',
    sql: `SELECT "t".*,
      COALESCE((SELECT jsonb_agg("sq") FROM (SELECT "x".*
        FROM "entrance_questions" AS "x" WHERE "x"."exam_id" = "t"."id") AS "sq"), '[]'::jsonb) AS "questions",
      COALESCE((SELECT jsonb_agg("sq") FROM (SELECT "x".*
        FROM "entrance_applications" AS "x" WHERE "x"."exam_id" = "t"."id") AS "sq"), '[]'::jsonb) AS "applications"
    FROM "entrance_exams" AS "t"
    ORDER BY "exam_date" ASC`,
  },
  {
    name: 'codes',
    sql: `SELECT * FROM "entrance_codes" ORDER BY "created_at" DESC`,
  },
  {
    name: 'applications (with exam embed)',
    sql: `SELECT "t".*,
      (SELECT to_jsonb("sq") FROM (SELECT "x".*
        FROM "entrance_exams" AS "x" WHERE "x"."id" = "t"."exam_id" LIMIT 1) AS "sq") AS "exam"
    FROM "entrance_applications" AS "t"
    ORDER BY "created_at" DESC`,
  },
  {
    name: 'classes',
    sql: `SELECT "id", "name", "level" FROM "classes" ORDER BY "level" ASC`,
  },
  {
    name: 'analytics (fetchAnalytics)',
    sql: `SELECT "t".*,
      (SELECT to_jsonb("sq") FROM (SELECT "x"."first_name", "x"."last_name"
        FROM "entrance_applications" AS "x" WHERE "x"."id" = "t"."application_id" LIMIT 1) AS "sq") AS "entrance_applications"
    FROM "student_analytics" AS "t"
    WHERE EXISTS (SELECT 1 FROM "entrance_applications" AS "x" WHERE "x"."id" = "t"."application_id")
    ORDER BY "generated_at" DESC`,
  },
];

(async () => {
  for (const q of queries) {
    try {
      const r = await pool.query(q.sql);
      console.log(`[OK] ${q.name}: ${r.rowCount} rows`);
    } catch (e) {
      console.error(`[FAIL] ${q.name}: ${e.message.slice(0, 300)}`);
    }
  }
  await pool.end();
})();
