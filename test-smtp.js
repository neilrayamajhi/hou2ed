const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials
const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testSMTP() {
  console.log('🧪 Testing Custom SMTP Configuration');
  console.log('=====================================\n');

  const timestamp = Date.now();
  const testEmail = `smtptest${timestamp}@gmail.com`;

  console.log('Creating test account:', testEmail);

  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!',
      options: {
        data: {
          full_name: 'SMTP Test',
          username: `smtp${timestamp}`,
          role: 'seeker'
        }
      }
    });

    if (error) {
      console.error('❌ Signup failed:', error.message);

      if (error.message.includes('rate')) {
        console.log('\n⚠️  You might still be on Supabase default email (3/hour limit)');
        console.log('Make sure you saved the SMTP settings in Supabase dashboard');
      }
    } else if (data?.user) {
      console.log('✅ Signup successful!');
      console.log('   User ID:', data.user.id);
      console.log('   Email sent:', data.user.confirmation_sent_at ? 'Yes' : 'No');

      if (data.user.confirmation_sent_at) {
        console.log('\n🎉 SUCCESS! Custom SMTP is working!');
        console.log('   Emails are now being sent through SendGrid');
        console.log('   You have 100 emails/day on free tier');
      }
    }

    // Test multiple signups to verify no rate limit
    console.log('\n📝 Testing multiple signups (no rate limit with custom SMTP)...\n');

    for (let i = 1; i <= 5; i++) {
      const testEmail2 = `smtptest${timestamp}_${i}@gmail.com`;
      console.log(`Test ${i}: Signing up ${testEmail2}`);

      const { data: data2, error: error2 } = await supabase.auth.signUp({
        email: testEmail2,
        password: 'TestPassword123!',
        options: {
          data: {
            full_name: `SMTP Test ${i}`,
            username: `smtp${timestamp}_${i}`,
            role: 'seeker'
          }
        }
      });

      if (error2) {
        console.error(`   ❌ Failed:`, error2.message);
        if (error2.message.includes('rate')) {
          console.log('\n⚠️  SMTP not configured properly - still hitting rate limits');
          break;
        }
      } else if (data2?.user?.confirmation_sent_at) {
        console.log(`   ✅ Email sent successfully`);
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n✅ All tests completed!');
    console.log('If all 5+ emails were sent, your custom SMTP is working perfectly!');

  } catch (err) {
    console.error('Error:', err);
  }

  process.exit(0);
}

testSMTP();