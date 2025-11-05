const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials
const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkEmailConfig() {
  console.log('🔍 Checking Supabase Email Configuration');
  console.log('=========================================\n');

  console.log('Project URL:', SUPABASE_URL);
  console.log('Project Ref:', 'rixiofltzptwaiwxhhlf');

  console.log('\n📧 Email Provider Information:');
  console.log('By default, Supabase uses their built-in email service');
  console.log('Rate limits: 3 emails per hour for free tier');

  console.log('\n⚠️  Common Issues:');
  console.log('1. Rate Limiting: Free tier allows only 3 emails per hour');
  console.log('2. Spam Filters: Emails often go to spam/junk folder');
  console.log('3. Email Provider: Default Supabase emails have lower deliverability');

  console.log('\n🔧 Solutions:');
  console.log('1. Check spam/junk folder for emails');
  console.log('2. Wait an hour if you\'ve sent multiple test emails');
  console.log('3. Consider setting up custom SMTP in Supabase dashboard');
  console.log('4. Add noreply@supabase.io to email whitelist');

  // Test if we can send a test email
  console.log('\n📬 Testing Email Send...');

  const testEmail = `test.${Date.now()}@example.com`;
  console.log('Attempting to create account with email:', testEmail);

  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!',
      options: {
        data: {
          full_name: 'Email Test',
          username: `emailtest${Date.now()}`,
          role: 'seeker'
        }
      }
    });

    if (error) {
      console.error('❌ Failed to send email:', error.message);

      if (error.message.includes('rate')) {
        console.log('\n⚠️  Rate limit detected!');
        console.log('You\'ve exceeded the email sending limit.');
        console.log('Wait 1 hour before trying again.');
      }
    } else if (data?.user) {
      console.log('✅ Email request successful');
      console.log('Confirmation sent at:', data.user.confirmation_sent_at);

      if (!data.user.confirmation_sent_at) {
        console.log('⚠️  No confirmation timestamp - email might not have been sent');
      }
    }
  } catch (err) {
    console.error('Error:', err);
  }

  console.log('\n📝 Recommendations:');
  console.log('1. If no emails are received, check Supabase dashboard > Authentication > Settings');
  console.log('2. Verify "Enable email confirmations" is ON');
  console.log('3. Check rate limits in dashboard');
  console.log('4. Consider using custom SMTP for better deliverability');

  process.exit(0);
}

checkEmailConfig();