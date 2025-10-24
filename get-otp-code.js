// IMPORTANT: This requires the service key to access auth.users table
// The service key should NEVER be in client code - this is only for debugging

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

// Service key is required to access OTP codes
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!serviceKey) {
  console.log('🔐 GET YOUR OTP CODE WITHOUT EMAIL');
  console.log('====================================\n');
  console.log('⚠️  This script requires the service key to access OTP codes.\n');
  console.log('To get your OTP code:');
  console.log('1. Go to Supabase Dashboard:');
  console.log('   https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf\n');
  console.log('2. Go to "Authentication" → "Users"');
  console.log('3. Find your test user in the list');
  console.log('4. Click on the user');
  console.log('5. Look for "confirmation_token" in the metadata');
  console.log('   (This is your 6-digit OTP code)\n');
  console.log('OR\n');
  console.log('1. Go to "Table Editor" → "auth" schema → "users" table');
  console.log('2. Find your user by email');
  console.log('3. Check the "confirmation_token" column\n');
  console.log('💡 Alternative: Check your email spam folder!');
  process.exit(0);
}

const supabaseAdmin = createClient(supabaseUrl, serviceKey);

async function getOtpCode() {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const email = await new Promise(resolve => {
    readline.question('Enter the email address to get OTP for: ', resolve);
  });

  readline.close();

  console.log('\n🔍 Looking up OTP code for:', email);

  try {
    // Get user from auth.users table
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }

    const user = users.users.find(u => u.email === email.toLowerCase());

    if (!user) {
      console.log('❌ User not found with email:', email);
      return;
    }

    console.log('\n✅ User found!');
    console.log('   User ID:', user.id);
    console.log('   Created:', new Date(user.created_at).toLocaleString());
    console.log('   Email Confirmed:', user.email_confirmed_at ? 'Yes' : 'No');

    // The OTP token might be in different places
    if (user.confirmation_token) {
      console.log('\n🔑 YOUR OTP CODE:', user.confirmation_token);
      console.log('   Enter this in the verification screen!');
    } else if (user.email_confirmation_token) {
      console.log('\n🔑 YOUR OTP CODE:', user.email_confirmation_token);
      console.log('   Enter this in the verification screen!');
    } else if (user.email_confirmed_at) {
      console.log('\n✅ Email already verified!');
      console.log('   You can login directly.');
    } else {
      console.log('\n⚠️  No OTP code found.');
      console.log('   The code may have expired or email was already sent.');
      console.log('   Try resending the verification email.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

getOtpCode().catch(console.error);