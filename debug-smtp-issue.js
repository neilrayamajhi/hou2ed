/**
 * Debug SMTP Configuration Issues
 * Helps identify why "Error sending confirmation email" occurs
 * 
 * Run: node debug-smtp-issue.js
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function debugSMTP() {
  console.log('════════════════════════════════════════════════════════════');
  console.log('   Debugging SMTP Configuration');
  console.log('════════════════════════════════════════════════════════════\n');

  const testEmail = `smtp-test-${Date.now()}@example.com`;
  
  console.log('🔍 Testing signup to trigger email...\n');
  console.log(`Test email: ${testEmail}`);
  console.log('Password: TestPass123!\n');

  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPass123!',
      options: {
        data: {
          full_name: 'SMTP Test',
          username: `test${Date.now()}`,
          role: 'seeker'
        }
      }
    });

    if (error) {
      console.log('❌ Signup Error:', error.message);
      console.log('\n📋 Error Analysis:\n');

      // Check specific error messages
      if (error.message.includes('Error sending confirmation email')) {
        console.log('🔴 SMTP Issue Detected!\n');
        console.log('Possible causes:');
        console.log('1. ❌ SMTP credentials are invalid');
        console.log('   → Check username/password in Supabase dashboard');
        console.log('');
        console.log('2. ❌ Sender email not verified');
        console.log('   → Verify your sender email with your SMTP provider');
        console.log('   → Most providers require domain verification');
        console.log('');
        console.log('3. ❌ SMTP server connection failed');
        console.log('   → Check host and port settings');
        console.log('   → Try port 587 (TLS) or 465 (SSL)');
        console.log('');
        console.log('4. ❌ Rate limit exceeded');
        console.log('   → Wait 10-20 minutes and try again');
        console.log('   → Or upgrade your email service plan');
        console.log('');
        console.log('5. ❌ Firewall/Network blocking SMTP');
        console.log('   → Check if your SMTP provider IPs are blocked');
        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('   WHAT TO CHECK IN SUPABASE DASHBOARD');
        console.log('═══════════════════════════════════════════════════════════\n');
        console.log('Go to: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/auth/settings\n');
        console.log('Scroll to "SMTP Settings" and verify:\n');
        console.log('✓ SMTP is enabled');
        console.log('✓ Host is correct (e.g., smtp.sendgrid.net)');
        console.log('✓ Port is correct (587 or 465)');
        console.log('✓ Username is correct');
        console.log('✓ Password/API key is correct');
        console.log('✓ Sender email is verified with your provider');
        console.log('✓ Sender name is set');
        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('   HOW TO VERIFY SENDER EMAIL');
        console.log('═══════════════════════════════════════════════════════════\n');
        console.log('If using SendGrid:');
        console.log('1. Go to: https://app.sendgrid.com/settings/sender_auth');
        console.log('2. Verify your domain or single sender');
        console.log('');
        console.log('If using Resend:');
        console.log('1. Go to: https://resend.com/domains');
        console.log('2. Add and verify your domain');
        console.log('');
        console.log('If using AWS SES:');
        console.log('1. Go to SES Console → Verified identities');
        console.log('2. Verify your email or domain');
        console.log('');
      } else if (error.message.includes('already registered')) {
        console.log('✅ SMTP is working (email already registered error is expected)');
      } else {
        console.log('⚠️  Unknown error:', error.message);
      }

      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('   QUICK FIXES');
      console.log('═══════════════════════════════════════════════════════════\n');
      console.log('Option 1: Check SMTP logs');
      console.log('   https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/logs/auth-logs\n');
      console.log('Option 2: Test with "Send Test Email" button');
      console.log('   https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/auth/templates\n');
      console.log('Option 3: Temporarily use different SMTP provider');
      console.log('   - Try Resend (easiest to verify)');
      console.log('   - Or SendGrid (100/day free)');
      console.log('');

      return;
    }

    if (data?.user) {
      console.log('✅ User created:', data.user.id);
      console.log('✅ Email:', data.user.email);
      
      if (data.user.email_confirmed_at) {
        console.log('⚠️  Email auto-confirmed (confirmations may be disabled)');
      } else {
        console.log('✅ Waiting for email confirmation');
        console.log('\n📧 Check your email service logs to see if email was sent:');
        console.log('   - SendGrid: https://app.sendgrid.com/activity');
        console.log('   - Resend: https://resend.com/emails');
        console.log('   - AWS SES: CloudWatch logs');
      }

      console.log('\n✅ SMTP appears to be working!');
      console.log('   If you received an email, SMTP is configured correctly.');
      console.log('   If not, check your spam folder or email provider logs.');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }

  console.log('\n════════════════════════════════════════════════════════════\n');
}

async function checkAuthLogs() {
  console.log('📊 To view detailed SMTP errors:\n');
  console.log('1. Open: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/logs/auth-logs');
  console.log('2. Filter by "error" or "smtp"');
  console.log('3. Look for detailed error messages\n');
  console.log('Common error patterns:');
  console.log('   • "535 Authentication failed" → Wrong username/password');
  console.log('   • "550 Sender not verified" → Need to verify sender email');
  console.log('   • "Connection timeout" → Wrong host/port');
  console.log('   • "Rate limit exceeded" → Too many emails sent');
  console.log('');
}

console.log('Starting SMTP diagnostics...\n');
debugSMTP().then(() => {
  console.log('Diagnostics complete!\n');
  checkAuthLogs();
});

