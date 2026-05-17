require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');

async function run() {
  const pool = new Pool({ 
    connectionString: process.env.NEON_DATABASE_URL,
    connectionTimeoutMillis: 10000,
  });
  
  try {
    // Test connection first
    await pool.query('SELECT NOW()');
    console.log('Connected to Neon database successfully');
    
    // Read and execute a small portion of the questions file to test
    const data = fs.readFileSync('MERGED_QUESTIONS_POPULATION.sql', 'utf8');
    console.log(`File length: ${data.length} characters`);
    console.log(`First 20 chars: '${data.substring(0, 20)}'`);
    console.log(`Last 20 chars: '${data.substring(data.length-20)}'`);
    
    // Try to execute just the first INSERT statement to see if it works
    const lines = data.split('\n');
    let insertStmt = '';
    let inInsert = false;
    
    for (const line of lines) {
      if (line.trim().startsWith('INSERT INTO')) {
        inInsert = true;
        insertStmt = line + '\n';
      } else if (inInsert) {
        insertStmt += line + '\n';
        if (line.trim().endsWith(';')) {
          // Found a complete INSERT statement
          console.log(`Attempting to execute: ${insertStmt.substring(0, 100)}...`);
          try {
            await pool.query(insertStmt);
            console.log('Insert successful!');
            break; // Just test one for now
          } catch (err) {
            console.error('Insert failed:', err.message);
            break;
          }
        }
      }
    }
    
  } catch (err) {
    console.error('Failed to connect to Neon database:', err);
  } finally {
    await pool.end();
  }
}

run().catch(console.error);