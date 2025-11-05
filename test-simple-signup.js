const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials
const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

// Create simple client without any custom fetch or timeout
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testSimpleSignup() {
  console.log('🧪 Testing Simple Signup (No Timeouts/Retries)');
  console.log('===============================================\n');

  const timestamp = Date.now();
  const testEmail = `simple${timestamp}@gmail.com`;

  console.log('Email:', testEmail);
  console.log('Starting signup...\n');

  const startTime = Date.now();

  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!',
      options: {
        data: {
          full_name: 'Simple Test',
          username: `simple${timestamp}`,
          role: 'seeker'
        }
      }
    });

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log(`Completed in ${duration} seconds\n`);

    if (error) {
      console.error('❌ Signup failed:', error.message);
      console.error('Error type:', error.name);
      console.error('Error code:', error.code);

      if (error.message.includes('rate')) {
        console.log('\n⚠️  Rate limit hit - wait 1 hour or configure SMTP');
      } else if (error.message.includes('Aborted')) {
        console.log('\n⚠️  Request was aborted - network issue');
      }
    } else if (data?.user) {
      console.log('✅ Signup succeeded!');
      console.log('   User ID:', data.user.id);
      console.log('   Email sent:', data.user.confirmation_sent_at ? 'Yes' : 'No');

      if (data.user.identities?.length === 0) {
        console.log('   ⚠️  Note: This might be a duplicate email');
      }
    }
  } catch (err) {
    console.error('Exception:', err.message);
  }

  console.log('\n📊 If this works but the app doesn\'t:');
  console.log('   The issue is in the React Native app code');
  console.log('   Otherwise, it\'s a Supabase/network issue');

  process.exit(0);
}

testSimpleSignup();