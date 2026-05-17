require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');

async function run() {
  const pool = new Pool({ 
    connectionString: process.env.NEON_DATABASE_URL,
    // Increase timeout for large operations
    connectionTimeoutMillis: 5000,
  });
  
  try {
    // Test connection first
    await pool.query('SELECT NOW()');
    console.log('Connected to Neon database successfully');
    
    const sql = fs.readFileSync('MERGED_SCHEMA_COMPLETE.sql', 'utf8');
    // Split by semicolon and remove empty statements
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    console.log(`Found ${statements.length} statements to execute`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      // Skip comments and empty statements
      if (statement.startsWith('--') || statement.length === 0) {
        continue;
      }
      
      try {
        await pool.query(statement);
        // Log progress every 50 statements
        if ((i + 1) % 50 === 0) {
          console.log(`Executed ${i + 1}/${statements.length} statements`);
        }
      } catch (err) {
        console.error(`Error executing statement ${i + 1}: ${statement.substring(0, 100)}...`);
        console.error(err.message);
        // Continue with other statements instead of stopping
        continue;
      }
    }
    
    console.log('Database schema setup completed.');
  } catch (err) {
    console.error('Failed to connect to Neon database:', err);
    throw err;
  } finally {
    await pool.end();
  }
}

run().catch(console.error);