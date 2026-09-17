require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    const res = await pool.query(`
      ALTER TABLE homework
        ADD COLUMN IF NOT EXISTS homework_type TEXT DEFAULT 'assignment',
        ADD COLUMN IF NOT EXISTS attachments TEXT[] DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
    `);
    console.log('Homework columns added/aligned. Status:', res.command);

    const cols = await pool.query(
      `SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'homework' ORDER BY ordinal_position;`
    );
    console.table(cols.rows);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();