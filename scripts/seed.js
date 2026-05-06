#!/usr/bin/env node
/**
 * ClearPath Edu Hub - Database Seeder
 * Run this script to seed your Supabase database with initial data
 * 
 * Usage: node scripts/seed.js [admin-password]
 * 
 * If no password is provided, defaults to 'Admin@123'
 */

const crypto = require('crypto');

// Supabase Admin Setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ndfrozgfzohkoyepoein.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kZnJvemdmem9oa295ZXBvZWluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1ODM5NywiZXhwIjoyMDkzNjM0Mzk3fQ.WX6oCSc5zOru9aUQlfKwZURR0_kcdG_TqTUU1u9kWyg';

const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const DEFAULT_ADMIN_PASSWORD = process.argv[2] || 'Admin@123';

console.log('='.repeat(50));
console.log('ClearPath Edu Hub - Database Seeder');
console.log('='.repeat(50));
console.log();

// Helper function for delays
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function createUser(email, password, firstName, lastName, role, phone = null) {
  console.log(`Creating ${role} user: ${email}...`);
  
  try {
    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role,
      },
    });

    if (authError) {
      // Check if user already exists
      if (authError.message.includes('already been registered')) {
        console.log(`  ⚠️  User already exists, skipping...`);
        return { success: true, skipped: true };
      }
      throw authError;
    }

    // Create profile
    if (authData?.user) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: authData.user.id,
          email,
          first_name: firstName,
          last_name: lastName,
          role,
          phone,
        });

      if (profileError && !profileError.message.includes('duplicate')) {
        throw profileError;
      }
    }

    console.log(`  ✓ Created successfully!`);
    return { success: true, user: authData?.user };
  } catch (error) {
    console.log(`  ✗ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function seed() {
  try {
    // Test connection
    console.log('Testing database connection...');
    const { data: testData, error: testError } = await supabaseAdmin
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.log(`  ✗ Connection failed: ${testError.message}`);
      console.log('\nPlease ensure:');
      console.log('  1. Your .env.local file has correct SUPABASE_SERVICE_ROLE_KEY');
      console.log('  2. The database schema has been applied');
      console.log('  3. Run COMPLETE_SCHEMA.sql in Supabase SQL Editor first\n');
      process.exit(1);
    }
    
    console.log('  ✓ Connected to database!\n');

    // Create users
    const users = [
      {
        email: 'admin@clearpatheduhub.com',
        password: DEFAULT_ADMIN_PASSWORD,
        firstName: 'System',
        lastName: 'Administrator',
        role: 'admin',
        phone: '+1234567890',
        description: 'Main Administrator',
      },
      {
        email: 'teacher@clearpatheduhub.com',
        password: DEFAULT_ADMIN_PASSWORD,
        firstName: 'John',
        lastName: 'Teacher',
        role: 'teacher',
        phone: '+1234567891',
        description: 'Teacher Account',
      },
      {
        email: 'student@clearpatheduhub.com',
        password: DEFAULT_ADMIN_PASSWORD,
        firstName: 'Jane',
        lastName: 'Student',
        role: 'student',
        phone: '+1234567892',
        description: 'Student Account',
      },
      {
        email: 'parent@clearpatheduhub.com',
        password: DEFAULT_ADMIN_PASSWORD,
        firstName: 'Parent',
        lastName: 'Guardian',
        role: 'parent',
        phone: '+1234567893',
        description: 'Parent Account',
      },
      {
        email: 'accountant@clearpatheduhub.com',
        password: DEFAULT_ADMIN_PASSWORD,
        firstName: 'Finance',
        lastName: 'Manager',
        role: 'accountant',
        phone: '+1234567894',
        description: 'Accountant Account',
      },
    ];

    console.log('Creating users...\n');
    
    const results = [];
    for (const user of users) {
      console.log(`[${user.role.toUpperCase()}] ${user.description}`);
      const result = await createUser(
        user.email,
        user.password,
        user.firstName,
        user.lastName,
        user.role,
        user.phone
      );
      results.push(result);
      await delay(500); // Small delay between users
      console.log();
    }

    // Summary
    console.log('='.repeat(50));
    console.log('SEEDING SUMMARY');
    console.log('='.repeat(50));
    
    const successful = results.filter(r => r.success && !r.skipped).length;
    const skipped = results.filter(r => r.skipped).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`Total users processed: ${results.length}`);
    console.log(`  ✓ Successfully created: ${successful}`);
    console.log(`  ⚠  Skipped (already exists): ${skipped}`);
    console.log(`  ✗ Failed: ${failed}`);
    console.log();

    if (successful > 0 || skipped > 0) {
      console.log('DEFAULT LOGIN CREDENTIALS:');
      console.log('-'.repeat(50));
      users.forEach(u => {
        console.log(`${u.role.toUpperCase()}: ${u.email} / ${DEFAULT_ADMIN_PASSWORD}`);
      });
      console.log();
    }

    if (failed > 0) {
      console.log('Some users failed to create. Check errors above.\n');
      process.exit(1);
    }

    console.log('✅ Seeding completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.log(`\n✗ Fatal error: ${error.message}\n`);
    process.exit(1);
  }
}

// Run the seeder
seed();