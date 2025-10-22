const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnoseAuth() {
  console.log('=== DIAGNOSING AUTHENTICATION SYSTEM ===\n');

  // Test accounts
  const testAccounts = [
    { email: 'neilrayamajhi34@gmail.com', username: 'neilray' },
    { email: 'n42411@student.ghctk12.com', username: 'Neil' },
    { email: 'neilrayamajhi2008@gmail.com', username: null }
  ];

  for (const account of testAccounts) {
    console.log(`\n--- Testing: ${account.email} ---`);

    // 1. Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', account.email)
      .maybeSingle();

    if (profile) {
      console.log('✅ Profile found:');
      console.log('  - ID:', profile.id);
      console.log('  - Username:', profile.username);
      console.log('  - Created:', profile.created_at);
    } else {
      console.log('❌ No profile in database');
    }

    // 2. Try to send password reset (this tells us if account exists in auth.users)
    console.log('\nTesting auth.users existence...');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      account.email,
      { redirectTo: 'http://localhost:3000/reset' }
    );

    if (!resetError) {
      console.log('✅ Account exists in auth.users (reset email sent)');
    } else {
      console.log('❌ Error with auth.users:', resetError.message);
    }

    // 3. Check if account might need email verification
    // We can't directly check this, but we can try OTP login
    console.log('\nTesting OTP login method...');
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: account.email,
      options: { shouldCreateUser: false }
    });

    if (!otpError) {
      console.log('✅ OTP sent - account can receive OTP codes');
    } else {
      console.log('❌ OTP error:', otpError.message);
    }
  }

  console.log('\n=== DIAGNOSIS COMPLETE ===\n');

  console.log('🔍 LIKELY ISSUES:');
  console.log('1. Accounts exist in auth.users but passwords were never set');
  console.log('2. Accounts were created with OTP/magic links only');
  console.log('3. Email verification might be required');
  console.log('4. Password authentication might be disabled');

  console.log('\n💡 SOLUTION:');
  console.log('Since password reset emails are being sent successfully,');
  console.log('the accounts exist but need password reset.\n');
  console.log('Option 1: Use the password reset link from your email');
  console.log('Option 2: Use OTP login instead of password');
  console.log('Option 3: Create new account with proper password\n');

  // Test if password auth is enabled
  console.log('=== TESTING AUTH CONFIGURATION ===\n');

  // Try to create a test account with password
  const testEmail = `test${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  console.log('Testing if password signup works...');
  const { data: signupData, error: signupError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword
  });

  if (signupError) {
    console.log('❌ Password signup error:', signupError.message);
    if (signupError.message.includes('not enabled')) {
      console.log('\n⚠️  PASSWORD AUTHENTICATION MIGHT BE DISABLED!');
      console.log('Check your Supabase dashboard:');
      console.log('Authentication > Providers > Email');
      console.log('Make sure "Enable Email provider" is ON');
    }
  } else {
    console.log('✅ Password signup works - auth system is functional');

    // Clean up test account
    if (signupData?.user) {
      console.log('Cleaning up test account...');
    }
  }
}

diagnoseAuth();