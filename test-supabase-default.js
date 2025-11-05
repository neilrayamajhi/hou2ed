const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

async function testSupabaseDefault() {
  console.log('🎯 TESTING SUPABASE DEFAULT EMAIL SERVICE');
  console.log('=========================================\n');

  console.log('⚠️  IMPORTANT: Make sure you:');
  console.log('1. Turned OFF "Enable custom SMTP" in Supabase');
  console.log('2. Clicked Save');
  console.log('3. Left it OFF\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const timestamp = Date.now();
  const mailinatorEmail = `default${timestamp}@mailinator.com`;

  console.log('Test email:', mailinatorEmail);
  console.log('Check at: https://www.mailinator.com/v4/public/inboxes.jsp?to=default' + timestamp);
  console.log('');

  try {
    // Test password reset
    console.log('📧 Sending Password Reset...');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      mailinatorEmail,
      { redirectTo: 'https://hou2ed.com/reset-password' }
    );

    if (resetError) {
      if (resetError.message?.includes('rate')) {
        console.log('⚠️  Rate limited (3-4 emails/hour with default service)');
      } else {
        console.log('❌ Failed:', resetError.message);
      }
    } else {
      console.log('✅ Email triggered with Supabase default service!');
      console.log('\n🎉 SUCCESS! Emails are working!');
      console.log('Check Mailinator inbox for the email');
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 USING SUPABASE DEFAULT EMAIL:');
    console.log('='.repeat(50));
    console.log('\nPros:');
    console.log('  ✅ Works immediately');
    console.log('  ✅ No configuration needed');
    console.log('  ✅ Reliable delivery');
    console.log('\nCons:');
    console.log('  ⚠️  Limited to 3-4 emails per hour');
    console.log('  ⚠️  Emails come from Supabase domain');
    console.log('\nGood for:');
    console.log('  • Development and testing');
    console.log('  • Small user base');
    console.log('  • Getting started quickly');

  } catch (err) {
    console.error('Error:', err.message);
  }
}

testSupabaseDefault();