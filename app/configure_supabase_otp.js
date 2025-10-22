/**
 * Script to authenticate with Supabase using OTP
 */

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function authenticateWithOTP() {
  console.log('🔐 Supabase OTP Authentication\n');

  // Ask for email
  rl.question('Enter your email: ', async (email) => {
    try {
      // Send OTP to email
      const { data, error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: true
        }
      });

      if (error) {
        console.error('Error sending OTP:', error.message);
        rl.close();
        return;
      }

      console.log(`\n✅ OTP sent to ${email}!`);
      console.log('Check your email and enter the 6-digit code.\n');

      // Ask for OTP code
      rl.question('Enter OTP code: ', async (token) => {
        try {
          // Verify OTP
          const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
            email: email,
            token: token,
            type: 'email'
          });

          if (verifyError) {
            console.error('Error verifying OTP:', verifyError.message);
            rl.close();
            return;
          }

          console.log('\n✅ Authentication successful!');
          console.log('Session:', verifyData.session);

          // Get the session token
          const session = verifyData.session;
          if (session) {
            console.log('\nAccess Token:', session.access_token);
            console.log('\nYou can now use this token with Supabase CLI:');
            console.log(`npx supabase login --token "${session.access_token}"`);
          }

          rl.close();
        } catch (err) {
          console.error('Error:', err);
          rl.close();
        }
      });
    } catch (err) {
      console.error('Error:', err);
      rl.close();
    }
  });
}

// Run the authentication
authenticateWithOTP();
