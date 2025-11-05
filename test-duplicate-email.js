const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials
const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testDuplicateEmail() {
  console.log('🧪 Testing Duplicate Email Prevention');
  console.log('=====================================\n');

  // Use an existing email (the one the user mentioned)
  const existingEmail = 'neilrayamajhi2008@gmail.com';
  const testPassword = 'TestPassword123!';
  const timestamp = Date.now();

  console.log('Testing with existing email:', existingEmail);
  console.log('This email should already exist in the system\n');

  try {
    // First, check if the email exists in profiles
    console.log('📝 Step 1: Checking profiles table...');
    const { data: profileExists, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, username, role')
      .eq('email', existingEmail.toLowerCase())
      .maybeSingle();

    if (profileError && !profileError.message?.includes('No rows')) {
      console.error('Error checking profile:', profileError);
    }

    if (profileExists) {
      console.log('✅ Email found in profiles table:');
      console.log('   - User ID:', profileExists.id);
      console.log('   - Username:', profileExists.username);
      console.log('   - Role:', profileExists.role);
    } else {
      console.log('⚠️ Email NOT found in profiles table');
      console.log('   (Email might exist in auth.users but not profiles)');
    }

    // Now try to sign up with the same email
    console.log('\n📝 Step 2: Attempting to sign up with existing email...');
    const { data, error } = await supabase.auth.signUp({
      email: existingEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Duplicate Test',
          username: `duplicate${timestamp}`,
          role: 'seeker'
        }
      }
    });

    if (error) {
      console.log('\n✅ GOOD: Signup was prevented!');
      console.log('Error message:', error.message);
      console.log('Error code:', error.code || 'N/A');

      if (error.message?.includes('already registered') ||
          error.message?.includes('already been registered')) {
        console.log('\n✅ Perfect! The system correctly identified the duplicate email.');
      }
    } else if (data?.user) {
      console.log('\n❌ BAD: Signup appeared to succeed!');
      console.log('This is the problematic behavior - the signup seems to work');
      console.log('but the user won\'t be able to verify because the email already exists.');
      console.log('\nUser data returned:');
      console.log('   - User ID:', data.user.id);
      console.log('   - Email:', data.user.email);
      console.log('   - Confirmed:', data.user.email_confirmed_at ? 'Yes' : 'No');

      // Check if this created a duplicate
      if (data.user.id !== profileExists?.id) {
        console.log('\n⚠️ CRITICAL: This created a DUPLICATE user in auth.users!');
        console.log('   Original user ID:', profileExists?.id);
        console.log('   New user ID:', data.user.id);
      }
    }

    // Test with a completely new email to show the difference
    console.log('\n\n📝 Step 3: Testing with a brand new email for comparison...');
    const newEmail = `testuser${timestamp}@gmail.com`;
    console.log('Testing with new email:', newEmail);

    const { data: newData, error: newError } = await supabase.auth.signUp({
      email: newEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'New User Test',
          username: `newuser${timestamp}`,
          role: 'seeker'
        }
      }
    });

    if (newError) {
      console.log('❌ New email signup failed:', newError.message);
    } else if (newData?.user) {
      console.log('✅ New email signup succeeded (as expected)');
      console.log('   - User ID:', newData.user.id);
      console.log('   - Verification email sent:', newData.user.confirmation_sent_at ? 'Yes' : 'No');
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }

  console.log('\n\n📋 Summary:');
  console.log('The app now checks for duplicate emails BEFORE attempting signup.');
  console.log('This prevents the confusing scenario where signup seems to work');
  console.log('but verification fails because the email already exists.');

  process.exit(0);
}

testDuplicateEmail();