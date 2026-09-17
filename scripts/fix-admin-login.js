require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const p = new Pool({ connectionString: process.env.NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } });

const hash = bcrypt.hashSync('admin123', 10);
console.log('new hash:', hash);

(async () => {
  const u = await p.query(`UPDATE profiles
     SET password_hash = $1
     WHERE LOWER(email) = 'admin@clearpath.com'
     RETURNING id, email, role`, [hash]);
  console.log('updated:', JSON.stringify(u.rows[0]));

  const v = await p.query(`SELECT email, password_hash FROM profiles WHERE LOWER(email) = 'admin@clearpath.com'`);
  const ok = bcrypt.compareSync('admin123', v.rows[0].password_hash);
  console.log('bcrypt compare admin123:', ok);

  const miss = await p.query(`SELECT role, count(*)::int AS n FROM profiles WHERE password_hash IS NULL OR password_hash = '' GROUP BY role ORDER BY role`);
  console.log('profiles missing password_hash by role:', JSON.stringify(miss.rows));

  const total = await p.query(`SELECT count(*)::int AS n FROM profiles`);
  console.log('total profiles:', total.rows[0].n);
  await p.end();
})().catch((e) => { console.error(e.message); process.exit(1); });