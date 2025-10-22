const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('Testing Supabase connection...');
  console.log('URL:', supabaseUrl);

  try {
    // Test 1: Check if we can connect to Supabase
    const { data: healthCheck, error: healthError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (healthError) {
      console.log('Database connection error:', healthError.message);
    } else {
      console.log('✅ Database connection successful');
    }

    // Test 2: Check if the email exists in profiles
    const email = 'neilrayamajhi2008@gmail.com';
    console.log('\nChecking if email exists in profiles:', email);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, username, created_at')
      .eq('email', email)
      .maybeSingle();

    if (profileError) {
      console.log('Error checking profile:', profileError.message);
    } else if (profile) {
      console.log('✅ Profile found:', {
        id: profile.id,
        email: profile.email,
        username: profile.username,
        created: profile.created_at
      });
    } else {
      console.log('❌ No profile found with this email');
    }

    // Test 3: List all users (first 5)
    console.log('\nListing existing users (first 5):');
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('email, username, created_at')
      .limit(5)
      .order('created_at', { ascending: false });

    if (usersError) {
      console.log('Error listing users:', usersError.message);
    } else if (users && users.length > 0) {
      users.forEach(u => {
        console.log(`- ${u.email || 'no email'} (${u.username || 'no username'}) - Created: ${u.created_at}`);
      });
    } else {
      console.log('No users found in profiles table');
    }

    // Test 4: Check auth.users table for the email
    console.log('\n=== Checking Auth Status ===');
    console.log('Note: We cannot directly query auth.users from client SDK');
    console.log('But we can try to sign in to check if the account exists');

    // Test 5: Try password reset to see if account exists
    console.log('\nTesting if account exists (via password reset):');
    const { data: resetData, error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: 'http://localhost:3000/reset' }
    );

    if (resetError) {
      console.log('Reset password error:', resetError.message);
    } else {
      console.log('✅ Password reset email sent (account exists in auth.users)');
      console.log('Check your email for the reset link');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testConnection();