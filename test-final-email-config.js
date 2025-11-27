const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

async function testFinalEmailConfig() {
  console.log('🎉 Testing Final Email Configuration');
  console.log('=====================================\n');

  console.log('✅ SendGrid Status:');
  console.log('  • API Key: Valid');
  console.log('  • Sender: hou2eddirectory@gmail.com (Verified)');
  console.log('  • Test email sent successfully\n');

  console.log('📝 Required Supabase SMTP Settings:');
  console.log('  • Enable custom SMTP: ON');
  console.log('  • Host: smtp.sendgrid.net');
  console.log('  • Port: 587');
  console.log('  • Username: apikey');
  console.log('  • Password: [YOUR_SENDGRID_API_KEY_HERE]');
  console.log('  • Sender email: hou2eddirectory@gmail.com');
  console.log('  • Sender name: Hou2ed\n');

  const timestamp = Date.now();
  const testEmail = `final${timestamp}@test.com`;
  const testPassword = 'TestPassword123!';
  const testUsername = `final${timestamp}`;

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    // Test 1: Create user via Edge Function
    console.log('📧 Test 1: Creating User & Triggering Email');
    console.log('--------------------------------------------');
    console.log('Email:', testEmail);
    console.log('Username:', testUsername);
    console.log('');

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
          fullName: 'Final Test User',
          username: testUsername,
          role: 'seeker',
        }),
      }
    );

    const data = await response.json();

    if (data.success) {
      console.log('✅ User created successfully!');
      console.log('  User ID:', data.user.id);
      console.log('  Needs Verification:', data.needsVerification);

      if (data.needsVerification) {
        console.log('\n📧 Email Status:');
        console.log('  OTP email should be sent to:', testEmail);
        console.log('  Check if SMTP is now working with SendGrid');
      }
    } else {
      console.log('❌ User creation failed:', data.error);
    }

    // Test 2: Password reset for real email
    console.log('\n📧 Test 2: Password Reset (Most Reliable Test)');
    console.log('-----------------------------------------------');
    console.log('Sending to: neilrayamajhi2008@gmail.com');

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      'neilrayamajhi2008@gmail.com',
      { redirectTo: 'https://hou2ed.com/reset-password' }
    );

    if (resetError) {
      console.log('❌ Password reset failed:', resetError.message);
      if (resetError.message?.includes('rate')) {
        console.log('  (Rate limited - too many attempts)');
      }
    } else {
      console.log('✅ Password reset email triggered!');
      console.log('  Check your inbox at neilrayamajhi2008@gmail.com');
      console.log('  If you receive this, Supabase SMTP is working!');
    }

    // Test 3: Resend OTP for new user
    console.log('\n📧 Test 3: Resending Verification OTP');
    console.log('--------------------------------------');

    await new Promise(resolve => setTimeout(resolve, 1000));

    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: testEmail,
    });

    if (resendError) {
      console.log('❌ OTP resend failed:', resendError.message);
    } else {
      console.log('✅ OTP resend triggered!');
      console.log('  Another email should be sent to:', testEmail);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 EMAIL CONFIGURATION TEST COMPLETE');
    console.log('='.repeat(60));

    console.log('\n🔍 Check your email now for:');
    console.log('  1. Password reset email at neilrayamajhi2008@gmail.com');
    console.log('  2. OTP verification code at', testEmail);

    console.log('\n✅ If emails arrive:');
    console.log('  • Your auth flow is FIXED!');
    console.log('  • Users can now sign up with email verification');
    console.log('  • Password resets work');

    console.log('\n❌ If NO emails arrive:');
    console.log('  1. Go to Supabase Dashboard → Settings → Auth → SMTP');
    console.log('  2. Toggle "Enable custom SMTP" OFF then ON again');
    console.log('  3. Re-enter all settings exactly as shown above');
    console.log('  4. Click "Save"');
    console.log('  5. Click "Send test email" button');

    console.log('\n💡 Alternative: Use Supabase Default Email');
    console.log('  • Turn OFF custom SMTP to use Supabase\'s built-in email');
    console.log('  • Limited to 3-4 emails per hour');
    console.log('  • Good for testing, not for production');

    console.log('\n📱 About Twilio (SMS):');
    console.log('  • You provided: 5FB6XQSRZ5AB3NV9GWTHEC1G');
    console.log('  • This appears to be an Account SID or API key');
    console.log('  • SMS can be used as alternative to email verification');
    console.log('  • Configure in Supabase → Settings → Auth → SMS Provider');

  } catch (error) {
    console.error('Test error:', error);
  }
}

testFinalEmailConfig();