const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4OTg4NiwiZXhwIjoyMDczOTY1ODg2fQ.J9Oc77ZR1E435SqDsngt8ey4_WVOeTE6UASlYo17Gbc';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

async function checkEmailConfiguration() {
  console.log('🔍 Checking Supabase Email Configuration');
  console.log('=========================================\n');

  // Create both admin and regular clients
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    // Test 1: Check if we can send emails through regular signup
    console.log('📧 Test 1: Testing regular signup email flow...');
    const timestamp = Date.now();
    const testEmail = `emailtest${timestamp}@test.com`;

    console.log(`  Attempting signup for: ${testEmail}`);

    // Use regular client signup (this should trigger email if configured)
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!',
      options: {
        data: {
          full_name: 'Email Test',
          username: `emailtest${timestamp}`,
          role: 'seeker'
        },
        emailRedirectTo: undefined // Use OTP flow
      }
    });

    if (signupError) {
      console.log('  ❌ Signup failed:', signupError.message);
      if (signupError.status === 504) {
        console.log('     (Timeout - trigger is still broken)');
      }
    } else if (signupData?.user) {
      console.log('  ✅ User created:', signupData.user.id);
      console.log('  Email confirmed:', signupData.user.email_confirmed_at ? 'Yes' : 'No');
      console.log('  Confirmation sent:', signupData.user.confirmation_sent_at ?
        `Yes at ${new Date(signupData.user.confirmation_sent_at).toLocaleString()}` : 'No');

      // Check for Supabase's duplicate user quirk
      if (!signupData.user.identities || signupData.user.identities.length === 0) {
        console.log('  ⚠️ User already exists (identities empty)');
      }
    }

    // Test 2: Check OTP/Magic Link configuration
    console.log('\n📧 Test 2: Checking OTP configuration...');

    // Try to resend OTP for an existing unverified user
    const { data: resendData, error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: 'test@example.com', // Use a test email
    });

    if (resendError) {
      console.log('  OTP resend failed:', resendError.message);
      if (resendError.message.includes('rate')) {
        console.log('  ⚠️ Rate limited - emails might be working but limited');
      } else if (resendError.message.includes('not found')) {
        console.log('  User not found for resend test');
      }
    } else {
      console.log('  OTP resend initiated');
    }

    // Test 3: Check password reset email (usually more reliable)
    console.log('\n📧 Test 3: Testing password reset email...');
    const { data: resetData, error: resetError } = await supabase.auth.resetPasswordForEmail(
      'neilrayamajhi2008@gmail.com',
      {
        redirectTo: 'hou2ed://reset-password',
      }
    );

    if (resetError) {
      console.log('  Password reset failed:', resetError.message);
    } else {
      console.log('  Password reset email sent (check inbox)');
    }

    // Test 4: Check Auth Settings via Admin
    console.log('\n⚙️ Test 4: Checking auth configuration...');

    // List recent users to see patterns
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 5
    });

    if (users) {
      console.log(`  Recent users (${users.length}):`);
      users.forEach(user => {
        console.log(`    - ${user.email}:`);
        console.log(`      Created: ${new Date(user.created_at).toLocaleString()}`);
        console.log(`      Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
        console.log(`      Last sign in: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}`);
      });
    }

    // Analysis
    console.log('\n📊 Analysis:');
    console.log('============');
    console.log('1. Email Service Status:');
    console.log('   - Supabase uses built-in email service (limited to 3/hour on free tier)');
    console.log('   - Custom SMTP not configured (would show in project settings)');

    console.log('\n2. Current Issues:');
    console.log('   - Database trigger causing 504 timeout on signup');
    console.log('   - Email service might be rate limited');
    console.log('   - OTP emails not being sent reliably');

    console.log('\n3. Possible Solutions:');
    console.log('   a) Configure custom SMTP (SendGrid/Resend)');
    console.log('   b) Use magic links instead of OTP');
    console.log('   c) Fix the trigger timeout issue first');
    console.log('   d) Use Edge Function to handle signup + email');

    console.log('\n🔗 Check Email Settings:');
    console.log('   https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/settings/auth');
    console.log('   Look for:');
    console.log('   - Email enabled: Should be ON');
    console.log('   - Email confirmations: Should be ON');
    console.log('   - SMTP settings: Configure if blank');
    console.log('   - Rate limits: Check if hitting limits');

  } catch (err) {
    console.error('Error:', err);
  }
}

checkEmailConfiguration();