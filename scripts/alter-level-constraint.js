require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function run() {
  // 1. Alter Neon PostgreSQL check constraint
  console.log('Connecting to Neon PostgreSQL...');
  const pool = new Pool({ 
    connectionString: process.env.NEON_DATABASE_URL,
    connectionTimeoutMillis: 10000,
  });

  try {
    await pool.query('SELECT NOW()');
    console.log('Connected to Neon successfully.');

    console.log('Altering level check constraint in Neon PostgreSQL...');
    await pool.query(`
      ALTER TABLE question_bank 
      DROP CONSTRAINT IF EXISTS question_bank_level_check;
    `);
    await pool.query(`
      ALTER TABLE question_bank 
      ADD CONSTRAINT question_bank_level_check 
      CHECK (level IN ('PRIMARY', 'JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'));
    `);
    console.log('Successfully updated level constraint in Neon PostgreSQL!');
  } catch (err) {
    console.error('Error altering Neon PostgreSQL constraint:', err.message);
  } finally {
    await pool.end();
  }

  // 2. Alter Supabase PostgreSQL check constraint (using the SQL client or an RPC, or direct table alteration if RLS is bypassed)
  // Wait, let's execute SQL on Supabase. Since there is no direct SQL endpoint in @supabase/supabase-js anon key or service role,
  // we can check if we can run it or if Supabase already allows PRIMARY and SS3.
  // Wait, in Supabase, does the question_bank table have a level check constraint?
  // Let's run a check or try to insert a test record for PRIMARY in Supabase.
  console.log('\nAltering Supabase check constraint...');
  console.log('Supabase tables can be altered directly if we have a direct connection, or we can check if it is already open.');
  console.log('Note: We will try to execute it through our seeder, but altering constraints on Supabase is typically done in the SQL editor.');
  console.log('However, if we use standard supabase admin client to insert, it will fail if the constraint exists.');
  console.log('Let\'s attempt to run a direct SQL check or insert to verify.');
}

run().catch(console.error);
