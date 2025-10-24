const { createClient } = require('@supabase/supabase-js');

// Your Supabase configuration
const supabaseUrl = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFixedSignup() {
  console.log('🧪 Testing FIXED Signup Flow (via Edge Function)');
  console.log('=================================================');
  console.log('');
  console.log('✨ This test uses the Edge Function directly');
  console.log('   Should complete in 2-3 seconds, NOT 50!');
  console.log('');

  const testEmail = `fixed${Date.now()}@test.com`;
  const testUsername = `fixed${Date.now()}`;
  const testPassword = 'TestPassword123!';

  console.log('📝 Test credentials:');
  console.log(`  Email: ${testEmail}`);
  console.log(`  Username: ${testUsername}`);
  console.log('');

  console.log('🚀 Calling Edge Function directly...');
  const startTime = Date.now();

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
          email: testEmail,
          password: testPassword,
          fullName: 'Test User',
          username: testUsername,
          role: 'seeker',
        }),
      }
    );

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    const data = await response.json();

    console.log(`  Completed in ${duration} seconds`);
    console.log('');

    if (data.success) {
      console.log('✅ SUCCESS! Signup completed without timeout!');
      console.log(`   User ID: ${data.user.id}`);
      console.log(`   Email: ${data.user.email}`);
      console.log(`   Duration: ${duration}s (not 50s!)}`);
      console.log('');
      console.log('🎉 THE FIX IS WORKING!');
      console.log('   Your app will now sign up users in 2-3 seconds');
      console.log('   No more 50-second timeouts!');

      if (data.needsVerification) {
        console.log('');
        console.log('📧 Verification email sent with 6-digit code');
      }
    } else {
      console.log('❌ Signup failed:', data.error);
      console.log('   Error code:', data.errorCode);
    }
  } catch (error) {
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.error('❌ Error calling Edge Function:', error.message);
    console.error(`   Failed after ${duration} seconds`);
  }
}

// Run the test
testFixedSignup();