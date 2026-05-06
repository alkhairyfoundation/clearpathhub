#!/usr/bin/env node
/**
 * ClearPath Edu Hub - Database Seeder
 * Seeds the Supabase database with an initial admin account
 * 
 * Usage: node scripts/seed.js [admin-password]
 * 
 * Environment variables required:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * 
 * If no password is provided, defaults to 'Admin@123'
 */

const crypto = require('crypto');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('\nERROR: Missing environment variables.');
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local\n');
  process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const DEFAULT_ADMIN_PASSWORD = process.argv[2] || 'Admin@123';

console.log('='.repeat(60));
console.log('ClearPath Edu Hub - Database Seeder');
console.log('='.repeat(60));
console.log();

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function createUser(email, password, firstName, lastName, role, phone = null) {
  console.log(`Creating ${role} user: ${email}...`);
  
  try {
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
      if (authError.message.includes('already been registered')) {
        console.log(`  User already exists, skipping...\n`);
        return { success: true, skipped: true };
      }
      throw authError;
    }

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

    console.log(`  Created successfully!\n`);
    return { success: true, user: authData?.user };
  } catch (error) {
    console.log(`  Error: ${error.message}\n`);
    return { success: false, error: error.message };
  }
}

async function seed() {
  try {
    console.log('Testing database connection...');
    const { error: testError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.log(`  Connection failed: ${testError.message}`);
      console.log('\nPlease ensure:');
      console.log('  1. Your .env.local file has correct credentials');
      console.log('  2. The database schema has been applied');
      console.log('  3. Run COMPLETE_SCHEMA.sql in Supabase SQL Editor first\n');
      process.exit(1);
    }
    
    console.log('  Connected to database!\n');

    const users = [
      {
        email: 'admin@clearpatheduhub.com',
        password: DEFAULT_ADMIN_PASSWORD,
        firstName: 'System',
        lastName: 'Administrator',
        role: 'admin',
        phone: '+2340000000000',
      },
      {
        email: 'teacher@clearpatheduhub.com',
        password: DEFAULT_ADMIN_PASSWORD,
        firstName: 'John',
        lastName: 'Teacher',
        role: 'teacher',
        phone: '+2340000000001',
      },
      {
        email: 'student@clearpatheduhub.com',
        password: DEFAULT_ADMIN_PASSWORD,
        firstName: 'Jane',
        lastName: 'Student',
        role: 'student',
        phone: '+2340000000002',
      },
      {
        email: 'parent@clearpatheduhub.com',
        password: DEFAULT_ADMIN_PASSWORD,
        firstName: 'Parent',
        lastName: 'Guardian',
        role: 'parent',
        phone: '+2340000000003',
      },
      {
        email: 'accountant@clearpatheduhub.com',
        password: DEFAULT_ADMIN_PASSWORD,
        firstName: 'Finance',
        lastName: 'Manager',
        role: 'accountant',
        phone: '+2340000000004',
      },
    ];

    console.log('Creating users...\n');
    
    const results = [];
    for (const user of users) {
      const result = await createUser(
        user.email,
        user.password,
        user.firstName,
        user.lastName,
        user.role,
        user.phone
      );
      results.push(result);
      await delay(500);
    }

    console.log('='.repeat(60));
    console.log('SEEDING SUMMARY');
    console.log('='.repeat(60));
    
    const successful = results.filter(r => r.success && !r.skipped).length;
    const skipped = results.filter(r => r.skipped).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`Total users processed: ${results.length}`);
    console.log(`  Created: ${successful}`);
    console.log(`  Skipped (already exists): ${skipped}`);
    console.log(`  Failed: ${failed}`);
    console.log();

    if (successful > 0 || skipped > 0) {
      console.log('LOGIN CREDENTIALS:');
      console.log('-'.repeat(60));
      users.forEach(u => {
        console.log(`  ${u.role.toUpperCase().padEnd(12)} ${u.email} / ${u.password}`);
      });
      console.log();
    }

    if (failed > 0) {
      console.log('Some users failed to create. Check errors above.\n');
      process.exit(1);
    }

    console.log('Seeding completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.log(`\nFatal error: ${error.message}\n`);
    process.exit(1);
  }
}

seed();
