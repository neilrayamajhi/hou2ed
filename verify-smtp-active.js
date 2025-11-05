const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials
const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifySMTP() {
  console.log('🔍 Verifying SMTP Configuration');
  console.log('================================\n');

  const timestamp = Date.now();

  console.log('📧 Rapid-fire email test (5 emails in a row)...\n');

  for (let i = 1; i <= 5; i++) {
    const testEmail = `smtpverify${timestamp}_${i}@gmail.com`;
    console.log(`Test ${i}: Creating account for ${testEmail}`);

    const startTime = Date.now();

    try {
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: 'TestPassword123!',
        options: {
          data: {
            full_name: `SMTP Test ${i}`,
            username: `smtptest${timestamp}_${i}`,
            role: 'seeker'
          }
        }
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      if (error) {
        if (error.message?.includes('rate')) {
          console.error(`   ❌ RATE LIMITED - SMTP not active!`);
          console.log('\n⚠️  SMTP is NOT configured properly!');
          console.log('Please check your Supabase dashboard:');
          console.log('1. Go to Authentication → Email Templates');
          console.log('2. Scroll to SMTP Settings');
          console.log('3. Make sure "Enable Custom SMTP" is ON');
          console.log('4. Verify all fields are filled correctly');
          console.log('5. Click "Save" again');
          break;
        } else if (error.message?.includes('Aborted')) {
          console.error(`   ❌ Request aborted after ${duration}ms`);
        } else {
          console.error(`   ❌ Error: ${error.message}`);
        }
      } else if (data?.user) {
        if (data.user.identities?.length === 0) {
          console.log(`   ⚠️  Duplicate email detected (${duration}ms)`);
        } else {
          console.log(`   ✅ Success! Email sent (${duration}ms)`);
        }
      }
    } catch (err) {
      console.error(`   ❌ Exception: ${err.message}`);
    }

    // No delay - testing rapid succession
  }

  console.log('\n📊 Results:');
  console.log('===========');
  console.log('If you see:');
  console.log('- All 5 succeeded: ✅ SMTP is working!');
  console.log('- Rate limit error: ❌ SMTP not configured');
  console.log('- All aborted: ❌ Network/timeout issue');

  process.exit(0);
}

verifySMTP();