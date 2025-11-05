const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials
const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testLogin() {
  const email = 'neilrayamajhi2008@gmail.com';
  const password = process.argv[2];

  if (!password) {
    console.log('❌ Please provide your password as an argument');
    console.log('Usage: node test-login-direct.js "yourpassword"');
    process.exit(1);
  }

  console.log('\n🔍 Testing login for:', email);
  console.log('=========================================\n');

  try {
    // First, let's check if we can fetch the user's profile
    console.log('1️⃣ Checking if user profile exists...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (profileError) {
      console.log('⚠️  No profile found in profiles table');
      console.log('   This might mean the user exists in auth but not in profiles');
    } else {
      console.log('✅ Profile found:');
      console.log('   - ID:', profile.id);
      console.log('   - Username:', profile.username || 'Not set');
      console.log('   - Role:', profile.role || 'Not set');
      console.log('   - Created:', new Date(profile.created_at).toLocaleString());
    }

    // Now try to authenticate
    console.log('\n2️⃣ Attempting authentication...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      console.error('\n❌ Authentication failed:', error.message);
      console.error('   Error code:', error.status);

      if (error.message.includes('Invalid login credentials')) {
        console.log('\n🔍 Diagnosis:');
        console.log('   The user exists (we can see it in your Supabase dashboard)');
        console.log('   But the password doesn\'t match what\'s stored');
        console.log('\n💡 Solution:');
        console.log('   Run: node reset-password-direct.js "yournewpassword"');
        console.log('   This will reset your password to something you know');
      }
    } else {
      console.log('\n✅ Authentication successful!');
      console.log('   User ID:', data.user.id);
      console.log('   Email:', data.user.email);
      console.log('   Email confirmed:', data.user.email_confirmed_at ? 'Yes' : 'No');
      console.log('   Role:', data.user.user_metadata?.role || 'Not set');
      console.log('   Username:', data.user.user_metadata?.username || 'Not set');
      console.log('\n🎉 You can now use this password to log in to the app!');

      // Sign out after successful test
      await supabase.auth.signOut();
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }

  process.exit(0);
}

testLogin();