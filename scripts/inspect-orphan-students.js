require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const neon = new Pool({ connectionString: process.env.NEON_DATABASE_URL });
(async () => {
  const rows = await neon.query(
    `SELECT s.class_id, COUNT(*)::int AS n
     FROM students s LEFT JOIN classes c ON c.id = s.class_id
     WHERE s.class_id IS NOT NULL AND c.id IS NULL
     GROUP BY s.class_id ORDER BY n DESC`
  );
  console.log('orphan students by class_id:');
  for (const r of rows.rows) console.log(`  ${r.class_id}: ${r.n} students`);

  const names = await neon.query(
    `SELECT DISTINCT name FROM classes ORDER BY name`
  );
  console.log('\nclass names:', names.rows.map(r => r.name).join(', '));
  await neon.end();
})();