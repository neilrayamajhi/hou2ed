const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSignupFlow() {
  console.log('=== TESTING SIGNUP FLOW ===\n');

  // Test with a real email that already exists
  const testEmail = 'neilrayamajhi34@gmail.com';
  const testPassword = 'TestPassword123!';

  console.log('Testing with existing account:', testEmail);
  console.log('This account was created during signup but may not be verified.\n');

  // Step 1: Check if account exists in auth.users
  console.log('1. Checking if account exists in auth.users...');
  const { error: resetError } = await supabase.auth.resetPasswordForEmail(testEmail);

  if (!resetError) {
    console.log('✅ Account EXISTS in auth.users (reset email sent)');
    console.log('   This confirms the account was created during signup.');
  } else {
    console.log('❌ Account might not exist:', resetError.message);
  }

  // Step 2: Try to login with password (should fail if not verified)
  console.log('\n2. Attempting password login (before verification)...');
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  });

  if (loginError) {
    console.log('❌ Password login failed:', loginError.message);

    if (loginError.message.includes('Email not confirmed')) {
      console.log('   → This is EXPECTED: Email needs verification first');
      console.log('   → The password WAS saved but login is blocked until verified');
    } else if (loginError.message.includes('Invalid login credentials')) {
      console.log('   → Password might be wrong OR email not verified');
    }
  } else {
    console.log('✅ Login successful! Email is already verified.');
  }

  // Step 3: Check profile status
  console.log('\n3. Checking profile status...');
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', testEmail)
    .maybeSingle();

  if (profile) {
    console.log('✅ Profile exists:');
    console.log('   - Username:', profile.username);
    console.log('   - Role:', profile.role);
    console.log('   - Created:', profile.created_at);
  } else {
    console.log('❌ No profile found - might be created after verification');
  }

  console.log('\n=== SUMMARY ===');
  console.log('The signup flow works like this:');
  console.log('1. Sign up creates account WITH password in auth.users ✅');
  console.log('2. Email verification is required before password login works');
  console.log('3. The 6-digit code ONLY verifies email, does NOT set password');
  console.log('4. After verification, the original password from signup works');
  console.log('\nTo fix accounts that can\'t login:');
  console.log('- They need to complete email verification');
  console.log('- OR use password reset if they forgot their signup password');
  console.log('- OR use the fix-auth-accounts.js script to set a new password');
}

testSignupFlow().catch(console.error);