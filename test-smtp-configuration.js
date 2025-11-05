const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testSMTPConfiguration() {
  console.log('🔍 Testing SMTP Configuration');
  console.log('=============================\n');

  // Test with a real email address
  const testEmail = process.argv[2] || 'neilrayamajhi2008@gmail.com';

  console.log('📧 Testing with email:', testEmail);
  console.log('');

  try {
    // Test 1: Password Reset (most reliable for testing SMTP)
    console.log('Test 1: Sending Password Reset Email');
    console.log('-------------------------------------');
    const { data: resetData, error: resetError } = await supabase.auth.resetPasswordForEmail(
      testEmail,
      {
        redirectTo: 'https://hou2ed.com/reset-password', // or your app URL
      }
    );

    if (resetError) {
      console.error('❌ Password reset failed:', resetError.message);
      console.error('   Error code:', resetError.code);
      console.error('   Status:', resetError.status);

      if (resetError.message?.includes('rate')) {
        console.log('   ⚠️ Rate limited - try again later');
      }
    } else {
      console.log('✅ Password reset email sent successfully!');
      console.log('   Check your inbox (and spam folder)');
      console.log('   If you receive this email, SMTP is working!');
    }

    // Wait a bit before next test
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: OTP Resend for existing unverified user
    console.log('\nTest 2: Resending OTP for Verification');
    console.log('---------------------------------------');
    const { data: resendData, error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: testEmail,
    });

    if (resendError) {
      console.error('❌ OTP resend failed:', resendError.message);

      if (resendError.message?.includes('rate')) {
        console.log('   ⚠️ Rate limited');
      } else if (resendError.message?.includes('not found')) {
        console.log('   User not found or already verified');
      }
    } else {
      console.log('✅ OTP resend initiated!');
      console.log('   Check for 6-digit verification code');
    }

    // Test 3: Create a test user to trigger signup email
    console.log('\nTest 3: Creating Test User (triggers signup email)');
    console.log('--------------------------------------------------');
    const timestamp = Date.now();
    const testSignupEmail = `smtptest${timestamp}@test.com`;

    console.log('Creating user:', testSignupEmail);

    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testSignupEmail,
      password: 'TestPassword123!',
      options: {
        data: {
          full_name: 'SMTP Test',
          username: `smtptest${timestamp}`,
          role: 'seeker'
        },
        emailRedirectTo: undefined, // Use OTP
      }
    });

    if (signupError) {
      console.error('❌ Signup failed:', signupError.message);

      // Check if it's the timeout issue
      if (signupError.status === 504) {
        console.log('   ⏱️ Timeout (trigger issue) - but email might still be sent');
      }
    } else if (signupData?.user) {
      // Check for duplicate user quirk
      if (!signupData.user.identities || signupData.user.identities.length === 0) {
        console.log('⚠️ User already exists (duplicate)');
      } else {
        console.log('✅ User created!');
        console.log('   User ID:', signupData.user.id);
        console.log('   Email confirmed:', signupData.user.email_confirmed_at ? 'Yes' : 'No');
        console.log('   Confirmation sent:', signupData.user.confirmation_sent_at ?
          new Date(signupData.user.confirmation_sent_at).toLocaleString() : 'Unknown');

        if (!signupData.user.email_confirmed_at) {
          console.log('   📧 Verification email should be sent to:', testSignupEmail);
        }
      }
    }

    // Analysis
    console.log('\n📊 SMTP Configuration Status:');
    console.log('=============================');

    console.log('\nIf you received any emails:');
    console.log('  ✅ SMTP is configured and working!');
    console.log('  → The auth flow should work properly');

    console.log('\nIf you did NOT receive emails:');
    console.log('  ❌ SMTP might not be configured properly');
    console.log('  Check:');
    console.log('  1. Go to: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/settings/auth');
    console.log('  2. Scroll to "SMTP Settings"');
    console.log('  3. Verify:');
    console.log('     - Custom SMTP is enabled');
    console.log('     - Host, port, username, password are correct');
    console.log('     - Sender email is valid');
    console.log('  4. Click "Send test email" button');

    console.log('\nCommon SMTP Issues:');
    console.log('  - Wrong API key/password');
    console.log('  - Sender email not verified with provider');
    console.log('  - Port blocked (try 587 for TLS or 465 for SSL)');
    console.log('  - Rate limiting from email provider');

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testSMTPConfiguration();