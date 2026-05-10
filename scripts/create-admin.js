#!/usr/bin/env node

const supabaseUrl = 'https://ndfrozgfzohkoyepoein.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kZnJvemdmem9oa295ZXBvZWluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1ODM5NywiZXhwIjoyMDkzNjM0Mzk3fQ.WX6oCSc5zOru9aUQlfKwZURR0_kcdG_TqTUU1u9kWyg';

const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  console.log('ClearPath Edu Hub - Admin Creator');
  console.log('==================================\n');

  console.log('Checking for existing admin users...');
  const { data: existingAdmins } = await supabaseAdmin
    .from('profiles')
    .select('id, email')
    .eq('role', 'admin');
  
  if (existingAdmins && existingAdmins.length > 0) {
    console.log(`Found ${existingAdmins.length} existing admin(s), deleting...`);
    for (const admin of existingAdmins) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(admin.id);
        await supabaseAdmin.from('profiles').delete().eq('id', admin.id);
        console.log(`  Deleted: ${admin.email}`);
      } catch (e) {
        console.log(`  Error deleting ${admin.email}: ${e.message}`);
      }
    }
    console.log();
  }

  console.log('Creating new admin user...');
  console.log('  Email: admin@clearpath.com');
  console.log('  Password: admin123\n');
  
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: 'admin@clearpath.com',
    password: 'admin123',
    email_confirm: true,
    user_metadata: {
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin',
    },
  });

  if (authError) {
    console.log(`Auth Error: ${authError.message}`);
    process.exit(1);
  }

  if (authData?.user) {
    console.log('Auth user created successfully!');
    
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: 'admin@clearpath.com',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin',
      });

    if (profileError && !profileError.message.includes('duplicate')) {
      console.log(`Profile Error: ${profileError.message}`);
      process.exit(1);
    }

    console.log('Profile created successfully!\n');
    console.log('==================================');
    console.log('ADMIN USER CREATED SUCCESSFULLY!');
    console.log('==================================');
    console.log('Email: admin@clearpath.com');
    console.log('Password: admin123');
    console.log('\nYou can now login to the dashboard.');
  }
}

main().catch(console.error);