const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials
const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function resetAndLogin() {
  const email = 'neilrayamajhi2008@gmail.com';
  const newPassword = process.argv[2];

  if (!newPassword) {
    console.log('❌ Please provide a new password as an argument');
    console.log('Usage: node reset-password-direct.js "yournewpassword"');
    process.exit(1);
  }

  if (newPassword.length < 8) {
    console.log('❌ Password must be at least 8 characters');
    process.exit(1);
  }

  console.log('\n🔐 Password Reset Process for:', email);
  console.log('=========================================\n');

  // Step 1: Send password reset email
  console.log('1️⃣ Sending password reset email...');
  const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);

  if (resetError) {
    console.error('❌ Failed to send reset email:', resetError.message);
    process.exit(1);
  }

  console.log('✅ Password reset email sent!');
  console.log('\n📧 Check your email for a 6-digit code');
  console.log('   (Also check spam/junk folder)');
  console.log('\n⚠️  IMPORTANT: The email will contain either:');
  console.log('   - A 6-digit code (like: 123456)');
  console.log('   - A link with the code in it');
  console.log('\nIf you see a link like:');
  console.log('https://rixiofltzptwaiwxhhlf.supabase.co/auth/v1/verify?token=123456&type=recovery');
  console.log('The code is the number after "token=" (in this example: 123456)\n');

  // Wait for user to get the code
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const code = await new Promise(resolve => {
    readline.question('2️⃣ Enter the 6-digit code from your email: ', resolve);
  });

  console.log('\n3️⃣ Verifying code and setting new password...');

  // Step 2: Verify OTP and set new password
  const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
    email: email,
    token: code.trim(),
    type: 'recovery'
  });

  if (verifyError) {
    console.error('❌ Failed to verify code:', verifyError.message);

    if (verifyError.message.includes('expired')) {
      console.log('\n💡 The code has expired. Please run this script again to get a new code.');
    } else if (verifyError.message.includes('invalid')) {
      console.log('\n💡 Invalid code. Make sure you entered the correct 6-digit code.');
      console.log('   If you received a link, extract the code from the URL.');
    }

    readline.close();
    process.exit(1);
  }

  // Step 3: Update password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (updateError) {
    console.error('❌ Failed to update password:', updateError.message);
    readline.close();
    process.exit(1);
  }

  console.log('✅ Password successfully updated!');

  // Step 4: Test the new password
  console.log('\n4️⃣ Testing login with new password...');

  // Sign out first
  await supabase.auth.signOut();

  // Try to sign in with new password
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: email,
    password: newPassword
  });

  if (loginError) {
    console.error('⚠️  Warning: Password was updated but login test failed:', loginError.message);
    console.log('\nTry logging in manually in the app with your new password.');
  } else {
    console.log('✅ Login successful with new password!');
    console.log('\n🎉 Everything is working! You can now log in to the app with:');
    console.log('   Email:', email);
    console.log('   Password: [the password you just set]');

    // Sign out after test
    await supabase.auth.signOut();
  }

  readline.close();
  console.log('\n✨ Process complete!');
}

resetAndLogin().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});