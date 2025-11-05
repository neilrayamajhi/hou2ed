const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials
const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fixNeilAccount() {
  console.log('🔧 Fixing account for neilrayamajhi2008@gmail.com');
  console.log('==============================================\n');

  const email = 'neilrayamajhi2008@gmail.com';
  const newPassword = 'TestPassword123!'; // You can change this

  try {
    // Step 1: Send password reset email with OTP
    console.log('Step 1: Sending password reset OTP...');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);

    if (resetError) {
      console.error('❌ Failed to send reset email:', resetError.message);
      return;
    }

    console.log('✅ Password reset email sent!');
    console.log('\n📧 Check your email for the 6-digit OTP code');
    console.log('   (Check spam folder if not in inbox)\n');

    // Step 2: Prompt for OTP code
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('Enter the 6-digit code from your email: ', async (otpCode) => {
      console.log('\n🔐 Verifying OTP and setting new password...');

      // Step 3: Verify OTP and set new password
      const { data, error } = await supabase.auth.verifyOtp({
        email: email,
        token: otpCode.trim(),
        type: 'recovery',
      });

      if (error) {
        console.error('❌ OTP verification failed:', error.message);
        rl.close();
        return;
      }

      if (data.user) {
        console.log('✅ OTP verified! Session created.');

        // Step 4: Update password
        console.log('\n🔑 Setting new password...');
        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (updateError) {
          console.error('❌ Failed to update password:', updateError.message);
        } else {
          console.log('✅ Password updated successfully!');

          // Step 5: Test login
          console.log('\n🧪 Testing login with new password...');
          const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email: email,
            password: newPassword
          });

          if (loginError) {
            console.error('❌ Login test failed:', loginError.message);
          } else if (loginData.user) {
            console.log('✅ Login successful!');
            console.log('\n✨ Account fixed! You can now login with:');
            console.log('   Email:', email);
            console.log('   Password:', newPassword);
            console.log('\n⚠️  IMPORTANT: Change this password after logging in!');

            // Sign out to clean up
            await supabase.auth.signOut();
          }
        }
      }

      rl.close();
    });

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

fixNeilAccount();