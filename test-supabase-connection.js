const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjkwMTQ2MTQsImV4cCI6MjA0NDU5MDYxNH0.a6DMJ0O9FGoXDCQKUpAjJFWZRqiJ-fwuKfS6vqcHeck';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('Testing Supabase connection...');
  console.log('URL:', supabaseUrl);

  try {
    // Test 1: Check if we can connect to Supabase
    const { data: healthCheck, error: healthError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (healthError) {
      console.log('Database connection error:', healthError.message);
    } else {
      console.log('✅ Database connection successful');
    }

    // Test 2: Check if the email exists in profiles
    const email = 'neilrayamajhi2008@gmail.com';
    console.log('\nChecking if email exists in profiles:', email);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, username, created_at')
      .eq('email', email)
      .maybeSingle();

    if (profileError) {
      console.log('Error checking profile:', profileError.message);
    } else if (profile) {
      console.log('✅ Profile found:', {
        id: profile.id,
        email: profile.email,
        username: profile.username,
        created: profile.created_at
      });
    } else {
      console.log('❌ No profile found with this email');
    }

    // Test 3: List all users (first 5)
    console.log('\nListing existing users (first 5):');
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('email, username, created_at')
      .limit(5);

    if (usersError) {
      console.log('Error listing users:', usersError.message);
    } else if (users && users.length > 0) {
      users.forEach(u => {
        console.log(`- ${u.email} (${u.username}) - Created: ${u.created_at}`);
      });
    } else {
      console.log('No users found in profiles table');
    }

    // Test 4: Try to authenticate with test credentials
    console.log('\n=== Testing Authentication ===');
    const testEmail = 'neilrayamajhi2008@gmail.com';
    const testPassword = 'password123'; // You should change this to your actual password

    console.log('Attempting login with:', testEmail);

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (authError) {
      console.log('❌ Authentication failed:', authError.message);
      console.log('Error code:', authError.status);

      // If invalid credentials, user might need to reset password or create new account
      if (authError.message.includes('Invalid login credentials')) {
        console.log('\nPossible issues:');
        console.log('1. Password is incorrect');
        console.log('2. User never set a password (only used OTP/magic link)');
        console.log('3. Account needs email verification');
        console.log('\nTry resetting your password or creating a new account');
      }
    } else if (authData?.user) {
      console.log('✅ Authentication successful!');
      console.log('User ID:', authData.user.id);
      console.log('Email:', authData.user.email);
      console.log('Verified:', authData.user.email_confirmed_at ? 'Yes' : 'No');

      // Sign out after test
      await supabase.auth.signOut();
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testConnection();