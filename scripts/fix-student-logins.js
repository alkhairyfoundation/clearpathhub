#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const p = new Pool({ connectionString: process.env.NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } });

const DEFAULT_PASSWORD = 'student123';

(async () => {
  const list = await p.query(
    `SELECT id, email, first_name, last_name FROM profiles
     WHERE password_hash IS NULL OR password_hash = '' ORDER BY email`);
  console.log(`Profiles without a password_hash: ${list.rows.length}`);
  if (list.rows.length === 0) { await p.end(); return; }

  const hash = bcrypt.hashSync(DEFAULT_PASSWORD, 10);
  const updated = [];
  for (const prof of list.rows) {
    await p.query(`UPDATE profiles SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [hash, prof.id]);
    updated.push(`${prof.email} (${prof.first_name} ${prof.last_name}, ${prof.role || 'unknown-role'})`);
  }

  const verify = await p.query(`SELECT email, password_hash FROM profiles WHERE password_hash = $1`, [hash]);
  console.log(`\nSet default password "${DEFAULT_PASSWORD}" for ${verify.rows.length} profile(s):`);
  for (const u of updated) console.log(`  - ${u}`);
  console.log(`\nbcrypt verify for first row: ${bcrypt.compareSync(DEFAULT_PASSWORD, verify.rows[0]?.password_hash || '')}`);
  await p.end();
  console.log('Done.');
})().catch((e) => { console.error(e.message); process.exit(1); });