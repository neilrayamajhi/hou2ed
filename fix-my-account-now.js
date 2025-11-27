#!/usr/bin/env node
/**
 * Quick fix for rayamajhineil@gmail.com
 * Reads credentials from app/.env automatically
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const EMAIL = 'rayamajhineil@gmail.com';

// Read .env file
function loadEnv() {
  const envPath = path.join(__dirname, 'app', '.env');
  
  if (!fs.existsSync(envPath)) {
    console.error('❌ app/.env file not found!');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      env[key] = value;
    }
  });

  return env;
}

async function fix() {
  console.log('🔧 Fixing account:', EMAIL);
  console.log('');

  try {
    const env = loadEnv();
    
    const SUPABASE_URL = env.EXPO_PUBLIC_SUPABASE_URL;
    const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY;

    if (!SUPABASE_URL) {
      console.error('❌ EXPO_PUBLIC_SUPABASE_URL not found in app/.env');
      process.exit(1);
    }

    if (!SERVICE_KEY) {
      console.error('❌ Service key not found in app/.env');
      console.error('');
      console.error('Add this line to app/.env:');
      console.error('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here');
      console.error('');
      console.error('Get it from:');
      console.error('https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/settings/api');
      console.error('(Look for "service_role" key)');
      process.exit(1);
    }

    console.log('✅ Found credentials in .env');
    console.log('   URL:', SUPABASE_URL);
    console.log('   Service key:', SERVICE_KEY.substring(0, 20) + '...');
    console.log('');

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Step 1: Check profiles
    console.log('Step 1: Checking profiles table...');
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, username, role')
      .eq('email', EMAIL.toLowerCase())
      .maybeSingle();

    if (profile) {
      console.log('✅ Profile EXISTS!');
      console.log('   Username:', profile.username);
      console.log('   Role:', profile.role);
      console.log('');
      console.log('Account is fine. Try:');
      console.log('- Password reset if you forgot password');
      console.log('- Check email for verification code');
      return;
    }

    console.log('⚠️  No profile found');
    console.log('');

    // Step 2: Check auth
    console.log('Step 2: Checking auth system...');
    const { data: authData } = await supabase.auth.admin.listUsers();
    const user = authData.users.find(u => u.email?.toLowerCase() === EMAIL.toLowerCase());

    if (!user) {
      console.log('✅ No orphaned account!');
      console.log('🎉 Email is free - you can sign up now!');
      return;
    }

    console.log('🎯 FOUND ORPHANED ACCOUNT!');
    console.log('   User ID:', user.id);
    console.log('   Email:', user.email);
    console.log('');

    // Step 3: Delete
    console.log('Step 3: Deleting...');
    await supabase.auth.admin.deleteUser(user.id);

    console.log('');
    console.log('✅ DONE! Account deleted!');
    console.log('🎉 You can now sign up with', EMAIL);
    console.log('');

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

fix();

