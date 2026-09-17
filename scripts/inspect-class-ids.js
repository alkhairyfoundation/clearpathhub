require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const neon = new Pool({ connectionString: process.env.NEON_DATABASE_URL });
(async () => {
  const cls = await neon.query(`SELECT id, name, level FROM classes ORDER BY level, name`);
  for (const c of cls.rows) console.log(`  ${c.name}: ${c.id}`);

  const dup = await neon.query(
    `SELECT id, COUNT(*)::int AS n, array_agg(name) AS names FROM classes GROUP BY id HAVING COUNT(*) > 1`
  );
  console.log('\nDuplicate ids:', dup.rowCount);
  for (const d of dup.rows) console.log(`  ${d.id}: ${d.n}x ${JSON.stringify(d.names)}`);

  await neon.end();
})();