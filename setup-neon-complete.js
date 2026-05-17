require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');

function stripBom(content) {
  // Remove UTF-8 BOM if present
  if (content.charCodeAt(0) === 0xFEFF) {
    return content.slice(1);
  }
  return content;
}

async function run() {
  const pool = new Pool({ 
    connectionString: process.env.NEON_DATABASE_URL,
    connectionTimeoutMillis: 10000,
  });
  
  try {
    // Test connection first
    await pool.query('SELECT NOW()');
    console.log('Connected to Neon database successfully');
    
    // Enable UUID extension
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    console.log('Enabled uuid-ossp extension');
    
    // Read and process the Neon-adapted schema file
    let sql = fs.readFileSync('neon-schema.sql', 'utf8');
    sql = stripBom(sql);
    
    // Split into lines and process sequentially to maintain order
    const lines = sql.split('\n');
    let currentStatement = '';
    let inDollarQuote = false;
    let dollarQuoteTag = '';
    
    for (const line of lines) {
      // Check if we're entering or exiting a dollar-quoted string
      if (!inDollarQuote) {
        const dollarMatch = line.match(/\$([^$]*)\$/);
        if (dollarMatch) {
          inDollarQuote = true;
          dollarQuoteTag = dollarMatch[1];
          // Continue building the statement
          currentStatement += line + '\n';
          continue;
        }
      } else {
        // Check if we're exiting the dollar-quoted string
        if (line.includes(`\$${dollarQuoteTag}\$`)) {
          inDollarQuote = false;
          dollarQuoteTag = '';
          // Continue building the statement
          currentStatement += line + '\n';
          // Now we have a complete statement to execute
          if (currentStatement.trim()) {
            try {
              await pool.query(currentStatement);
              // Log every 20th statement to avoid too much output
              const stmtLines = currentStatement.trim().split('\n');
              if (stmtLines.length > 1 || currentStatement.trim().length > 100) {
                console.log(`Executed statement (~${stmtLines.length} lines)`);
              }
            } catch (err) {
              // Only log errors for non-comment statements
              const trimmed = currentStatement.trim();
              if (!trimmed.startsWith('--') && trimmed.length > 0) {
                console.error(`Error executing statement: ${trimmed.substring(0, 100)}...`);
                console.error(err.message);
              }
            }
            currentStatement = '';
          }
          continue;
        }
      }
      
      // If we're in a dollar-quoted string, just accumulate
      if (inDollarQuote) {
        currentStatement += line + '\n';
        continue;
      }
      
      // Not in dollar quote, check for statement end
      currentStatement += line + '\n';
      
      // If line ends with semicolon and we're not in a quote, execute
      if (line.trim().endsWith(';')) {
        const stmtToExecute = currentStatement.trim();
        if (stmtToExecute) {
          try {
            await pool.query(stmtToExecute);
            // Log every 20th statement to avoid too much output
            const stmtLines = stmtToExecute.split('\n');
            if (stmtLines.length > 1 || stmtToExecute.length > 100) {
              console.log(`Executed statement (~${stmtLines.length} lines)`);
            }
          } catch (err) {
            // Only log errors for non-comment statements
            if (!stmtToExecute.startsWith('--') && stmtToExecute.length > 0) {
              console.error(`Error executing statement: ${stmtToExecute.substring(0, 100)}...`);
              console.error(err.message);
            }
          }
          currentStatement = '';
        }
      }
    }
    
    // Execute any remaining statement
    if (currentStatement.trim()) {
      try {
        await pool.query(currentStatement);
        console.log(`Executed final statement (~${currentStatement.trim().split('\n').length} lines)`);
      } catch (err) {
        console.error(`Error executing final statement: ${currentStatement.trim().substring(0, 100)}...`);
        console.error(err.message);
      }
    }
    
    console.log('Neon database schema setup completed.');
    
    // Now load seed data from the original files (strip BOM)
    console.log('Loading seed data...');
    let seedSql = fs.readFileSync('MERGED_SEED_DATA.sql', 'utf8');
    seedSql = stripBom(seedSql);
    await pool.query(seedSql);
    console.log('Seed data loaded successfully');
    
    // Load questions population (strip BOM)
    console.log('Loading questions population...');
    let questionsSql = fs.readFileSync('MERGED_QUESTIONS_POPULATION.sql', 'utf8');
    questionsSql = stripBom(questionsSql);
    await pool.query(questionsSql);
    console.log('Questions population loaded successfully');
    
  } catch (err) {
    console.error('Failed to connect to Neon database or execute SQL:', err);
    throw err;
  } finally {
    await pool.end();
  }
}

run().catch(console.error);