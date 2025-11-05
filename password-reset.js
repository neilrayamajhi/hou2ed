const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials
const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function resetPassword() {
  const email = 'neilrayamajhi2008@gmail.com';

  console.log('Sending password reset email to:', email);

  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'hou2ed://reset-password',
    });

    if (error) {
      console.error('Password reset failed:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        code: error.code
      });
    } else {
      console.log('Password reset email sent successfully!');
      console.log('Check your email for the reset link.');
      console.log('Response:', data);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }

  process.exit(0);
}

resetPassword();