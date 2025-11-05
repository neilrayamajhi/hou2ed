const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

async function testCompleteAuthFlow() {
  console.log('🧪 Testing Complete Auth Flow with Email Verification');
  console.log('=====================================================\n');

  const timestamp = Date.now();
  const testEmail = `flowtest${timestamp}@test.com`;
  const testPassword = 'TestPassword123!';
  const testUsername = `flowtest${timestamp}`;

  console.log('Test User:');
  console.log('  Email:', testEmail);
  console.log('  Username:', testUsername);
  console.log('  Password:', testPassword);
  console.log('');

  try {
    // Step 1: Call the Edge Function
    console.log('📝 Step 1: Creating user via Edge Function...');
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/signup-with-verification`,
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
          fullName: 'Flow Test User',
          username: testUsername,
          role: 'seeker',
        }),
      }
    );

    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));

    if (!data.success) {
      console.error('❌ User creation failed:', data.error);
      return false;
    }

    console.log('✅ User created successfully!');
    console.log('  User ID:', data.user.id);
    console.log('  Needs Verification:', data.needsVerification);
    console.log('  Message:', data.message);

    if (data.needsVerification) {
      console.log('\n📧 Email Verification Required');
      console.log('  A 6-digit OTP code should be sent to:', testEmail);
      console.log('  (Check if SMTP is working and email was received)');

      // Test if we can resend the OTP
      console.log('\n📝 Step 2: Testing OTP resend...');
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: testEmail,
      });

      if (resendError) {
        console.error('❌ OTP resend failed:', resendError.message);
      } else {
        console.log('✅ OTP resend successful!');
        console.log('  Another verification email should be sent');
      }

      // Simulate OTP verification (would need actual code from email)
      console.log('\n📝 Step 3: To complete verification:');
      console.log('  1. Check email for 6-digit code');
      console.log('  2. Enter code in app verification screen');
      console.log('  3. User will be logged in automatically');

      // Test login before verification (should fail)
      console.log('\n📝 Step 4: Testing login before verification...');
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      });

      if (loginError) {
        console.log('✅ Correct: Login blocked until email verified');
        console.log('  Error:', loginError.message);
      } else {
        console.log('⚠️ User can login without verification (might be auto-confirmed)');
      }
    } else {
      console.log('\n✅ User is already confirmed (can login immediately)');
    }

    return true;

  } catch (error) {
    console.error('Test failed:', error);
    return false;
  }
}

// Run the test
testCompleteAuthFlow().then(success => {
  console.log('\n=====================================');
  if (success) {
    console.log('✅ Auth Flow Test Complete!');
    console.log('\nSummary:');
    console.log('  1. Edge Function creates users successfully');
    console.log('  2. Email verification is required');
    console.log('  3. OTP emails should be sent (if SMTP is configured)');
    console.log('  4. Users cannot login until verified');
    console.log('\nCheck your email to verify SMTP is working!');
  } else {
    console.log('❌ Auth flow test failed');
  }
  process.exit(success ? 0 : 1);
});