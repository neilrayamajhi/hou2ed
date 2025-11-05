const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials
const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testAuth() {
  const email = 'neilrayamajhi2008@gmail.com';
  const password = process.argv[2];

  if (!password) {
    console.error('Please provide password as argument: node test-auth.js <password>');
    process.exit(1);
  }

  console.log('Testing authentication for:', email);

  try {
    // First, let's check if the user exists in profiles
    console.log('\n1. Checking if user exists in profiles...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (profileError) {
      console.error('Profile lookup error:', profileError);
    } else {
      console.log('Profile found:', {
        id: profile.id,
        email: profile.email,
        username: profile.username,
        role: profile.role,
        email_verified: profile.email_verified,
        created_at: profile.created_at
      });
    }

    // Now try to authenticate
    console.log('\n2. Attempting authentication...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      console.error('Authentication failed:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        code: error.code
      });

      // Try to get more info
      if (error.message.includes('Invalid login credentials')) {
        console.log('\nPossible issues:');
        console.log('- Password might be incorrect');
        console.log('- User might not exist in auth.users table');
        console.log('- Email might not be verified');
      }
    } else {
      console.log('Authentication successful!');
      console.log('User:', {
        id: data.user.id,
        email: data.user.email,
        email_confirmed_at: data.user.email_confirmed_at,
        created_at: data.user.created_at
      });
    }

    // Check auth.users table (this might fail due to permissions)
    console.log('\n3. Checking auth status...');
    const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.log('Cannot check auth.users directly (needs admin access)');
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }

  process.exit(0);
}

testAuth();