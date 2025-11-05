const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

async function testEmailOptions() {
  console.log('🔧 TESTING EMAIL OPTIONS');
  console.log('========================\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log('📧 IMMEDIATE ACTION NEEDED:');
  console.log('---------------------------\n');

  console.log('Option 1: Fix SendGrid (Recommended)');
  console.log('1. Go to: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/settings/auth');
  console.log('2. Scroll to SMTP Settings');
  console.log('3. Toggle "Enable custom SMTP" OFF then ON');
  console.log('4. Copy-paste these EXACTLY:');
  console.log('   Host: smtp.sendgrid.net');
  console.log('   Port: 587');
  console.log('   Username: apikey');
  console.log('   Password: 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');
  console.log('   Sender email: hou2eddirectory@gmail.com');
  console.log('   Sender name: Hou2ed');
  console.log('5. Click Save');
  console.log('6. Click "Send test email"\n');

  console.log('Option 2: Use Supabase Default (Quick Fix)');
  console.log('1. Turn OFF "Enable custom SMTP"');
  console.log('2. Click Save');
  console.log('3. Leave it OFF');
  console.log('Note: Limited to 3-4 emails/hour\n');

  console.log('----------------------------');
  console.log('Testing Password Reset Email');
  console.log('----------------------------');

  const testEmail = 'neilrayamajhi2008@gmail.com';

  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(
      testEmail,
      { redirectTo: 'https://hou2ed.com/reset-password' }
    );

    if (error) {
      if (error.message?.includes('rate')) {
        console.log('⚠️  Rate limited - wait a few minutes and try again');
        console.log('This means the system is trying to send but hitting limits');
      } else {
        console.log('❌ Failed:', error.message);
      }
    } else {
      console.log('✅ Password reset triggered!');
      console.log('\n🔍 CHECK YOUR EMAIL NOW:');
      console.log('   Email sent to:', testEmail);
      console.log('   Check spam/junk folder too');
      console.log('\nIf you receive this email:');
      console.log('   → Your current SMTP setting is working!');
      console.log('\nIf NO email arrives in 2 minutes:');
      console.log('   → Try the other option above');
    }

    // Also test signup email
    const timestamp = Date.now();
    const signupEmail = `option${timestamp}@test.com`;

    console.log('\n----------------------------');
    console.log('Testing Signup OTP Email');
    console.log('----------------------------');

    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: signupEmail,
      password: 'TestPassword123!',
      options: {
        emailRedirectTo: undefined, // Use OTP
      }
    });

    if (signupError) {
      console.log('❌ Signup failed:', signupError.message);
    } else if (signupData?.user) {
      if (!signupData.user.identities || signupData.user.identities.length === 0) {
        console.log('⚠️  User already exists');
      } else {
        console.log('✅ Signup triggered!');
        console.log('   Test email:', signupEmail);
        console.log('   If using custom SMTP: Check for OTP code');
        console.log('   If using default: Limited by rate limit');
      }
    }

  } catch (err) {
    console.error('Error:', err.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('💡 COMMON ISSUES & FIXES:');
  console.log('='.repeat(50));
  console.log('\n1. Username field MUST be exactly: apikey');
  console.log('   (Not "SG.xxx" or your email)');
  console.log('\n2. Password field gets your SendGrid API key');
  console.log('   (The one starting with SG.)');
  console.log('\n3. If nothing works, use Supabase default email');
  console.log('   (Turn OFF custom SMTP completely)');
  console.log('\n4. SendGrid might need "Single Sender Verification"');
  console.log('   Check: https://app.sendgrid.com/settings/sender_auth');
}

testEmailOptions();