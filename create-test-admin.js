const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const bcrypt = require('bcryptjs');

async function createAdmin() {
  const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL });
  try {
    // Check if admin already exists
    const { rows: existing } = await pool.query('SELECT * FROM profiles WHERE email = $1', ['admin@eduhub.com']);
    if (existing.length > 0) {
      console.log('Admin user already exists:', existing[0]);
      return existing[0];
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('admin123', salt);

    // Insert admin profile
    const { rows } = await pool.query(
      `INSERT INTO profiles (id, email, first_name, last_name, role, phone, password_hash, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id, email, first_name, last_name, role`,
      ['admin@eduhub.com', 'Admin', 'User', 'admin', '+1234567890', passwordHash]
    );

    console.log('Admin user created:', rows[0]);
    return rows[0];
  } catch (err) {
    console.error('Error creating admin:', err.message);
    throw err;
  } finally {
    await pool.end();
  }
}

createAdmin().then(console.log).catch(console.error);