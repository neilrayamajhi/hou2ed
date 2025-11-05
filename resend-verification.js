const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials
const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function resendVerification(email) {
  console.log('📧 Resending verification email');
  console.log('================================\n');
  console.log('Email:', email);

  try {
    // Method 1: Try resending OTP
    console.log('\n📝 Method 1: Resending OTP...');
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });

    if (error) {
      console.error('❌ Failed to resend OTP:', error.message);

      // Method 2: Try password reset as alternative
      console.log('\n📝 Method 2: Trying password reset email instead...');
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);

      if (resetError) {
        console.error('❌ Password reset also failed:', resetError.message);
      } else {
        console.log('✅ Password reset email sent!');
        console.log('Check your email for the reset link.');
      }
    } else {
      console.log('✅ Verification email resent!');
      console.log('Check your email for the 6-digit code.');
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

// Get email from command line or use default
const email = process.argv[2] || 'neilrayamajhi2008@gmail.com';
resendVerification(email);