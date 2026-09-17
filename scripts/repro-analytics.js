require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL });

(async () => {
  // Exact SQL the neon-engine builds for:
  // db.from('student_analytics').select('*, entrance_applications!inner(first_name, last_name)')
  //   .order('generated_at', { ascending: false })
  const sql = `
    SELECT "t".*,
      (SELECT to_jsonb("sq")
       FROM (SELECT "x"."first_name", "x"."last_name"
             FROM "entrance_applications" AS "x"
             WHERE "x"."id" = "t"."application_id" LIMIT 1) AS "sq") AS "entrance_applications"
    FROM "student_analytics" AS "t"
    WHERE EXISTS (SELECT 1 FROM "entrance_applications" AS "x" WHERE "x"."id" = "t"."application_id")
    ORDER BY "generated_at" DESC
  `;
  try {
    const r = await pool.query(sql);
    console.log('rows returned:', r.rowCount);
    const row = r.rows[0];
    console.log('first row:', JSON.stringify(row).slice(0, 400));
  } catch (e) {
    console.error('SQL ERROR:', e.message.slice(0, 500));
  }

  // Also check what score type is on student_analytics (could be numeric/text)
  const cols = await pool.query(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_schema='public' AND table_name='student_analytics'`
  );
  console.log('\nstudent_analytics schema:');
  for (const c of cols.rows) console.log(`  ${c.column_name}: ${c.data_type}`);

  await pool.end();
})();