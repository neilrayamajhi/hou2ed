const { createClient } = require('@supabase/supabase-js');

// Your Supabase configuration
const supabaseUrl = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testYourEmailDelivery() {
  console.log('📧 EMAIL DELIVERY TROUBLESHOOTING');
  console.log('==================================\n');

  // Ask user for their email
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const email = await new Promise(resolve => {
    readline.question('Enter YOUR email address to test: ', resolve);
  });

  readline.close();

  console.log('\n🔍 Testing email delivery to:', email);
  console.log('=====================================\n');

  // Test 1: Create a new account with Edge Function
  console.log('📝 Test 1: Creating account via Edge Function...');

  const testUsername = `test${Date.now()}`;
  const testPassword = 'TestPassword123!';

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/signup-with-verification`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          email: email,
          password: testPassword,
          fullName: 'Test User',
          username: testUsername,
          role: 'seeker',
        }),
      }
    );

    const data = await response.json();

    if (data.success) {
      console.log('✅ Account created successfully!');
      console.log('   User ID:', data.user.id);
      console.log('   Needs verification:', data.needsVerification ? 'Yes' : 'No');

      if (data.needsVerification) {
        console.log('\n📬 VERIFICATION EMAIL STATUS:');
        console.log('   Email should be sent to:', email);
        console.log('   From: noreply@mail.app.supabase.io OR custom SMTP');
        console.log('   Subject: "Confirm Your Email" or similar');
        console.log('   Contains: 6-digit OTP code');
      }
    } else if (data.errorCode === 'EMAIL_EXISTS' || data.errorCode === 'EMAIL_EXISTS_RESENT') {
      console.log('⚠️  Email already registered');
      console.log('   A new verification code has been sent if unverified');
    } else {
      console.log('❌ Signup failed:', data.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  // Test 2: Try password reset as backup
  console.log('\n📝 Test 2: Sending password reset email...');

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'hou2ed://reset-password'
    });

    if (!error) {
      console.log('✅ Password reset email sent!');
      console.log('   This uses the same email system');
    } else {
      console.log('❌ Password reset failed:', error.message);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  // Provide debugging instructions
  console.log('\n' + '='.repeat(60));
  console.log('🔍 WHERE TO CHECK FOR YOUR EMAILS:');
  console.log('='.repeat(60));

  if (email.includes('gmail.com')) {
    console.log('\n📧 GMAIL USERS - Check these locations IN ORDER:');
    console.log('1. Primary Inbox');
    console.log('2. Promotions Tab');
    console.log('3. Spam Folder (⚠️ MOST LIKELY HERE)');
    console.log('4. All Mail folder (shows everything including filtered)');
    console.log('5. Trash (in case auto-deleted)');
    console.log('\n🔍 Search Gmail for:');
    console.log('   from:supabase OR from:mail.app.supabase.io');
    console.log('   subject:"Confirm Your Email"');
    console.log('\n💡 TO FIX GMAIL BLOCKING:');
    console.log('   1. Mark Supabase emails as "Not Spam"');
    console.log('   2. Add noreply@mail.app.supabase.io to contacts');
    console.log('   3. Create filter: from:supabase → Never send to spam');
  } else if (email.includes('outlook') || email.includes('hotmail')) {
    console.log('\n📧 OUTLOOK/HOTMAIL - Check:');
    console.log('1. Focused Inbox');
    console.log('2. Other Inbox');
    console.log('3. Junk Email folder');
    console.log('4. Deleted Items');
  } else if (email.includes('yahoo')) {
    console.log('\n📧 YAHOO - Check:');
    console.log('1. Inbox');
    console.log('2. Spam folder');
    console.log('3. Trash');
  } else {
    console.log('\n📧 Check these common locations:');
    console.log('1. Main Inbox');
    console.log('2. Spam/Junk folder');
    console.log('3. Quarantine (if corporate email)');
    console.log('4. Filtered folders');
  }

  console.log('\n' + '='.repeat(60));
  console.log('⏰ TIMING EXPECTATIONS:');
  console.log('='.repeat(60));
  console.log('• Supabase default SMTP: 30 seconds - 2 minutes');
  console.log('• Custom SMTP (if configured): 5-30 seconds');
  console.log('• Rate limited: May not arrive (3/hour limit on free)');

  console.log('\n' + '='.repeat(60));
  console.log('🚨 IF NO EMAIL ARRIVES AFTER 5 MINUTES:');
  console.log('='.repeat(60));
  console.log('\n1. RATE LIMIT ISSUE (Most likely):');
  console.log('   • Free Supabase = 3 emails per hour');
  console.log('   • Solution: Wait 1 hour or upgrade Supabase');

  console.log('\n2. CONFIGURE CUSTOM SMTP:');
  console.log('   • Go to: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/settings/auth');
  console.log('   • Scroll to "SMTP Settings"');
  console.log('   • Add SendGrid, Resend, or other SMTP');

  console.log('\n3. ALTERNATIVE - DISABLE EMAIL VERIFICATION:');
  console.log('   • In Supabase Dashboard → Authentication → Providers');
  console.log('   • Turn OFF "Confirm email"');
  console.log('   • Users can sign up without verification');

  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST COMPLETE');
  console.log('='.repeat(60));
  console.log('\nYour test credentials (save these):');
  console.log('Email:', email);
  console.log('Username:', testUsername);
  console.log('Password:', testPassword);
}

// Run the test
testYourEmailDelivery().catch(console.error);