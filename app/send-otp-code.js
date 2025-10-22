const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function sendOTPCode() {
  const email = 'neilrayamajhi2008@gmail.com';

  console.log('=== Sending OTP Code (Not Magic Link) ===\n');
  console.log('Sending 6-digit code to:', email);

  try {
    // Use signInWithOtp to send a CODE, not a link
    const { data, error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        shouldCreateUser: false, // Don't create a new user
      }
    });

    if (error) {
      console.log('❌ Error sending OTP:', error.message);
      return;
    }

    console.log('✅ OTP CODE sent successfully!');
    console.log('\n📧 Check your email for a 6-DIGIT CODE (not a link)');
    console.log('The email should contain something like: "Your verification code is: 123456"');
    console.log('\nOnce you have the code, you can verify it in the app.');

    // Also create a verification script
    console.log('\nTo verify the code, run:');
    console.log('node verify-otp.js <6-digit-code>');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

sendOTPCode();