const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function sendPasswordReset() {
  console.log('=== PASSWORD RESET TOOL ===\n');

  const accounts = [
    'neilrayamajhi34@gmail.com',
    'n42411@student.ghctk12.com',
    'neilrayamajhi2008@gmail.com'
  ];

  console.log('This will send password reset emails to all your accounts.\n');
  console.log('Accounts to reset:');
  accounts.forEach((email, i) => console.log(`${i + 1}. ${email}`));

  console.log('\nSending password reset emails...\n');

  for (const email of accounts) {
    console.log(`Sending to ${email}...`);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'http://localhost:19006/reset-password' // Update this to your app URL
    });

    if (error) {
      console.log(`❌ Failed for ${email}:`, error.message);
    } else {
      console.log(`✅ Reset email sent to ${email}`);
    }

    // Wait a bit between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n=== INSTRUCTIONS ===');
  console.log('1. Check your email inbox for password reset links');
  console.log('2. Click the link in the email');
  console.log('3. You\'ll be redirected to set a new password');
  console.log('4. After setting the password, you can log in with it');
  console.log('\nNote: The reset links expire in 1 hour');
  console.log('\nIMPORTANT: If you see "magic link" instead of reset link,');
  console.log('it means the email templates need to be updated in Supabase dashboard.');
}

sendPasswordReset().catch(console.error);