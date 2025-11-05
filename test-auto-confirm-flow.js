const fetch = require('node-fetch');

const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

async function testAutoConfirmFlow() {
  console.log('🧪 Testing Auto-Confirm Signup Flow');
  console.log('====================================\n');

  const timestamp = Date.now();
  const testEmail = `autotest${timestamp}@test.com`;
  const testPassword = 'TestPassword123!';
  const testUsername = `autotest${timestamp}`;

  console.log('Test User Details:');
  console.log('  Email:', testEmail);
  console.log('  Username:', testUsername);
  console.log('  Password:', testPassword);
  console.log('');

  try {
    // Step 1: Call the Edge Function to create user
    console.log('📝 Step 1: Creating user via Edge Function...');
    const startTime = Date.now();

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/secure-signup`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          fullName: 'Auto Test User',
          username: testUsername,
          role: 'seeker',
        }),
      }
    );

    const duration = (Date.now() - startTime) / 1000;
    const data = await response.json();

    console.log(`  Response received in ${duration}s`);

    if (!data.success) {
      console.error('❌ User creation failed:', data.error);
      return false;
    }

    console.log('✅ User created successfully!');
    console.log('  User ID:', data.user.id);
    console.log('  Email Confirmed:', data.user.email_confirmed_at ? 'Yes' : 'No');
    console.log('  Needs Verification:', data.needsVerification);

    // Step 2: Test immediate login (should work without verification)
    console.log('\n📝 Step 2: Testing immediate login (no verification needed)...');

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (loginError) {
      console.error('❌ Login failed:', loginError.message);
      console.log('\nThis means the user still needs verification (auto-confirm might not be working)');
      return false;
    }

    console.log('✅ Login successful without verification!');
    console.log('  Session created:', loginData.session ? 'Yes' : 'No');
    console.log('  User can use the app immediately!');

    // Clean up - sign out
    await supabase.auth.signOut();

    return true;

  } catch (error) {
    console.error('Test failed:', error.message);
    return false;
  }
}

// Run the test
testAutoConfirmFlow().then(success => {
  console.log('\n====================================');
  if (success) {
    console.log('✅ AUTO-CONFIRM FLOW IS WORKING!');
    console.log('\nWhat this means:');
    console.log('  1. Users can sign up');
    console.log('  2. No email verification needed');
    console.log('  3. Users can login immediately');
    console.log('  4. The auth flow is fixed for ALL users!');
  } else {
    console.log('❌ Auto-confirm flow test failed');
    console.log('Check the errors above for details.');
  }
  process.exit(success ? 0 : 1);
});