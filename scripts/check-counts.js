require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function run() {
  const pool = new Pool({ 
    connectionString: process.env.NEON_DATABASE_URL,
    connectionTimeoutMillis: 10000,
  });
  
  try {
    const res = await pool.query(`
      SELECT level, subject, difficulty_level, COUNT(*) as count 
      FROM question_bank 
      GROUP BY level, subject, difficulty_level
      ORDER BY level, subject, difficulty_level
    `);
    
    console.log('--- Current Question Bank Counts ---');
    console.table(res.rows);
    
    const uniqueLevels = await pool.query(`
      SELECT DISTINCT level FROM question_bank ORDER BY level
    `);
    console.log('Unique levels in DB:', uniqueLevels.rows.map(r => r.level).join(', '));
  } catch (err) {
    console.error('Error running count query:', err);
  } finally {
    await pool.end();
  }
}

run().catch(console.error);
