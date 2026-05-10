#!/usr/bin/env node

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
        email: 'admin@clearpath.com',
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        phone: '+2340000000000',
      },
    ];

    // Delete existing admin user first (if any)
    console.log('Checking for existing admin user...');
    const { data: existingAdmins } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('role', 'admin');
    
    if (existingAdmins && existingAdmins.length > 0) {
      console.log(`Found ${existingAdmins.length} existing admin(s), deleting...`);
      for (const admin of existingAdmins) {
        await supabaseAdmin.auth.admin.deleteUser(admin.id);
        await supabaseAdmin.from('profiles').delete().eq('id', admin.id);
        console.log(`  Deleted: ${admin.email}`);
      }
    }
    console.log();

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
      console.log(`  ADMIN:       ${users[0].email} / ${users[0].password}`);
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
