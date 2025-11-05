const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

async function verifySendGridFix() {
  console.log('🔍 VERIFYING SENDGRID FIX');
  console.log('==========================\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log('📋 Checklist for Supabase SMTP Settings:');
  console.log('-----------------------------------------');
  console.log('✓ Enable custom SMTP: ON');
  console.log('✓ Host: smtp.sendgrid.net');
  console.log('✓ Port: 587');
  console.log('✓ Username: apikey (⚠️ exactly this word!)');
  console.log('✓ Password: SG.s_CiepO... (your API key)');
  console.log('✓ Sender email: hou2eddirectory@gmail.com');
  console.log('✓ Sender name: Hou2ed\n');

  try {
    // Test 1: Password Reset (most reliable)
    console.log('📧 Test 1: Password Reset Email');
    console.log('--------------------------------');

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      'neilrayamajhi2008@gmail.com',
      { redirectTo: 'https://hou2ed.com/reset-password' }
    );

    if (resetError) {
      if (resetError.message?.includes('rate')) {
        console.log('⚠️  Rate limited - too many attempts');
        console.log('    Wait 5 minutes before trying again');
      } else {
        console.log('❌ Failed:', resetError.message);
      }
    } else {
      console.log('✅ Password reset email triggered!');
      console.log('\n📬 CHECK YOUR EMAIL NOW!');
      console.log('   Sent to: neilrayamajhi2008@gmail.com');
      console.log('   From: hou2eddirectory@gmail.com');
      console.log('   Subject: "Reset Your Password" or similar');
      console.log('\n   Also check:');
      console.log('   • Spam/Junk folder');
      console.log('   • Promotions tab (Gmail)');
      console.log('   • All Mail folder');
    }

    // Test 2: Create new user for OTP test
    console.log('\n📧 Test 2: Signup Verification Email');
    console.log('-------------------------------------');

    const timestamp = Date.now();
    const testEmail = `sendgridfix${timestamp}@test.com`;

    console.log('Creating test user:', testEmail);

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
          password: 'TestPassword123!',
          fullName: 'SendGrid Fix Test',
          username: `sendgridfix${timestamp}`,
          role: 'seeker',
        }),
      }
    );

    const data = await response.json();

    if (data.success) {
      console.log('✅ User created!');
      if (data.needsVerification) {
        console.log('   📧 OTP email should be sent to:', testEmail);
        console.log('   (This tests if signup emails work)');
      }
    } else {
      console.log('❌ Signup failed:', data.error);
    }

  } catch (err) {
    console.error('Error:', err.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎯 RESULTS INTERPRETATION');
  console.log('='.repeat(60));

  console.log('\nIf you receive the password reset email:');
  console.log('  ✅ SendGrid is working!');
  console.log('  ✅ Your SMTP settings are correct!');
  console.log('  ✅ Your app is ready for production!');

  console.log('\nIf you DON\'T receive any emails:');
  console.log('  1. Double-check Username is EXACTLY: apikey');
  console.log('  2. Make sure there are no extra spaces in any field');
  console.log('  3. Try the "Send test email" button in Supabase');
  console.log('  4. Check SendGrid activity: https://app.sendgrid.com/email_activity');

  console.log('\n💡 Last Resort Options:');
  console.log('  Option A: Create a new SendGrid API key');
  console.log('  Option B: Use Supabase default (turn OFF custom SMTP)');
  console.log('  Option C: Try a different email provider (Resend, Postmark)');
}

verifySendGridFix();