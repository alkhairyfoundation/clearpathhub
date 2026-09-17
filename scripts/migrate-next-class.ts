require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  const before = (await pool.query('SELECT id, name, level, next_class_id FROM classes ORDER BY name')).rows;
  console.log('=== BEFORE ===');
  for (const c of before) console.log(`${c.name.padEnd(28)} next_class_id=${(c.next_class_id || '').slice(0, 8) || 'NULL'}`);

  const { buildNextClassMap } = require('../src/lib/promotion');
  const classes: { id: string; name: string; level: unknown; next_class_id: string | null }[] = before.map((r: any) => ({
    id: r.id,
    name: r.name,
    level: r.level,
    next_class_id: r.next_class_id,
  }));
  const nextMap = buildNextClassMap(classes);

  for (const c of classes) {
    await pool.query('UPDATE classes SET next_class_id = $1 WHERE id = $2', [nextMap[c.id], c.id]);
  }

  const after = (await pool.query(
    'SELECT c.id, c.name, n.name AS next_name FROM classes c LEFT JOIN classes n ON n.id = c.next_class_id ORDER BY c.name'
  )).rows;
  console.log('\n=== AFTER (next_class_id now matches the promotion ladder) ===');
  for (const c of after) console.log(`${c.name.padEnd(28)} -> ${(c.next_name || 'NULL').padEnd(26)} ${c.id.slice(0, 8)}`);

  await pool.end();
  console.log('\nData fixed.');
})().catch((e) => { console.error(e); process.exit(1); });