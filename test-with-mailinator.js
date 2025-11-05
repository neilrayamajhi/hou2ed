const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

async function testWithMailinator() {
  console.log('🎯 TESTING SUPABASE EMAIL WITH MAILINATOR');
  console.log('=========================================\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const timestamp = Date.now();
  const testEmail = `supatest${timestamp}@mailinator.com`;

  console.log('Using Mailinator email (no Gmail blocking):');
  console.log('  Email:', testEmail);
  console.log('  Check at: https://www.mailinator.com/v4/public/inboxes.jsp?to=supatest' + timestamp);
  console.log('');

  try {
    // Test 1: Password Reset (most reliable)
    console.log('📧 Test 1: Password Reset to Mailinator');
    console.log('----------------------------------------');

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      testEmail,
      { redirectTo: 'https://hou2ed.com/reset-password' }
    );

    if (resetError) {
      console.log('❌ Reset failed:', resetError.message);
    } else {
      console.log('✅ Password reset triggered!');
      console.log('   Check Mailinator in 30 seconds');
    }

    // Test 2: Signup
    console.log('\n📧 Test 2: Signup with Mailinator Email');
    console.log('----------------------------------------');

    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!',
      options: {
        data: {
          full_name: 'Mailinator Test',
          username: `mailtest${timestamp}`,
          role: 'seeker'
        }
      }
    });

    if (signupError) {
      console.log('❌ Signup failed:', signupError.message);
    } else if (signupData?.user) {
      if (!signupData.user.identities || signupData.user.identities.length === 0) {
        console.log('⚠️  User already exists');
      } else {
        console.log('✅ Signup triggered!');
        console.log('   User ID:', signupData.user.id);
        console.log('   Email confirmed:', signupData.user.email_confirmed_at ? 'Yes' : 'No');
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('🔍 CHECK MAILINATOR NOW:');
    console.log('='.repeat(50));
    console.log('\nDirect link to your test inbox:');
    console.log('https://www.mailinator.com/v4/public/inboxes.jsp?to=supatest' + timestamp);
    console.log('\nYou should see:');
    console.log('  • Password reset email (if Supabase SMTP works)');
    console.log('  • Signup verification email (if Supabase SMTP works)');

    console.log('\n📊 RESULTS:');
    console.log('If emails arrive → Supabase SMTP is fixed!');
    console.log('If no emails → Supabase SMTP still not working');

    console.log('\n🔧 For Gmail Issue:');
    console.log('Since Gmail is blocking, you need to:');
    console.log('1. Check Gmail spam folder');
    console.log('2. Add hou2eddirectory@gmail.com to contacts');
    console.log('3. Check Gmail filters (Settings → Filters)');
    console.log('4. Try a different email provider for testing');

  } catch (err) {
    console.error('Error:', err.message);
  }
}

testWithMailinator();