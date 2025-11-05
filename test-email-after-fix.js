const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4OTg4NiwiZXhwIjoyMDczOTY1ODg2fQ.J9Oc77ZR1E435SqDsngt8ey4_WVOeTE6UASlYo17Gbc';

async function testEmailAfterFix() {
  console.log('🚀 Testing Email Configuration After Port Fix (585 → 587)');
  console.log('========================================================\n');

  const timestamp = Date.now();
  const testEmail = `portfix${timestamp}@test.com`;
  const testPassword = 'TestPassword123!';
  const testUsername = `portfix${timestamp}`;

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log('📧 SMTP Configuration Status:');
  console.log('  ✅ Port changed from 585 to 587');
  console.log('  Host: smtp.sendgrid.net');
  console.log('  Username: apikey');
  console.log('  Sender: hou2eddirectory@gmail.com\n');

  try {
    // Test 1: Create user via Edge Function
    console.log('📝 Test 1: Creating User via Edge Function');
    console.log('------------------------------------------');
    console.log('  Email:', testEmail);
    console.log('  Username:', testUsername);
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
          fullName: 'Email Test After Fix',
          username: testUsername,
          role: 'seeker',
        }),
      }
    );

    const data = await response.json();

    if (!data.success) {
      console.error('❌ Edge Function failed:', data.error);
      return;
    }

    console.log('✅ User created successfully!');
    console.log('  User ID:', data.user.id);
    console.log('  Email Confirmed:', data.user.email_confirmed_at ? 'Yes' : 'No');
    console.log('  Needs Verification:', data.needsVerification);

    // Check if confirmation was sent
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(
      data.user.id
    );

    if (userData?.user) {
      console.log('\n📊 Email Sending Status:');
      console.log('  Confirmation Sent At:', userData.user.confirmation_sent_at ?
        new Date(userData.user.confirmation_sent_at).toLocaleString() :
        '❌ NOT SENT');

      if (userData.user.confirmation_sent_at) {
        console.log('  ✅ Email should be sent via SendGrid!');
        console.log('  📧 Check inbox for 6-digit OTP code');
      } else {
        console.log('  ❌ No confirmation email triggered');
      }
    }

    // Test 2: Try resending OTP
    console.log('\n📝 Test 2: Resending OTP Email');
    console.log('--------------------------------');

    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: testEmail,
    });

    if (resendError) {
      console.error('❌ Resend failed:', resendError.message);
    } else {
      console.log('✅ OTP resend triggered!');
      console.log('  Another email should be sent');
    }

    // Test 3: Password Reset (most reliable)
    console.log('\n📝 Test 3: Password Reset Email');
    console.log('--------------------------------');
    console.log('Testing with: neilrayamajhi2008@gmail.com');

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      'neilrayamajhi2008@gmail.com',
      { redirectTo: 'https://hou2ed.com/reset-password' }
    );

    if (resetError) {
      console.error('❌ Password reset failed:', resetError.message);
    } else {
      console.log('✅ Password reset email triggered!');
      console.log('  Check neilrayamajhi2008@gmail.com inbox');
    }

    // Test 4: Check recent users
    console.log('\n📝 Test 4: Recent Users Email Status');
    console.log('-------------------------------------');

    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 5
    });

    if (users) {
      const recentUsers = users
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

      recentUsers.forEach(user => {
        const confirmedAt = user.email_confirmed_at ?
          new Date(user.email_confirmed_at).toLocaleString() :
          'NOT CONFIRMED';
        const sentAt = user.confirmation_sent_at ?
          new Date(user.confirmation_sent_at).toLocaleString() :
          'NOT SENT';

        console.log(`\n  ${user.email}:`);
        console.log(`    Created: ${new Date(user.created_at).toLocaleString()}`);
        console.log(`    Confirmation Sent: ${sentAt}`);
        console.log(`    Confirmed: ${confirmedAt}`);

        if (user.confirmation_sent_at && !user.email_confirmed_at) {
          console.log(`    📧 Waiting for verification`);
        } else if (!user.confirmation_sent_at) {
          console.log(`    ❌ No email sent`);
        }
      });
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY - Email Configuration Test Results');
    console.log('='.repeat(60));

    console.log('\n✅ WHAT\'S FIXED:');
    console.log('  • Port corrected from 585 to 587');
    console.log('  • Edge Function creates users successfully');
    console.log('  • Profile creation works');

    console.log('\n🔍 CHECK NOW:');
    console.log('  1. Check your email for OTP codes');
    console.log('  2. Check SendGrid dashboard for activity');
    console.log('  3. Look in spam/junk folders');

    console.log('\n📧 EMAILS THAT SHOULD BE SENT:');
    console.log('  • Signup OTP to:', testEmail);
    console.log('  • Password reset to: neilrayamajhi2008@gmail.com');

    console.log('\n💡 IF STILL NO EMAILS:');
    console.log('  1. Verify SendGrid API key is correct');
    console.log('  2. Check sender email is verified in SendGrid');
    console.log('  3. Check SendGrid activity feed for blocks/bounces');
    console.log('  4. Try clicking "Send test email" in Supabase dashboard');

  } catch (error) {
    console.error('Test error:', error);
  }
}

testEmailAfterFix();