const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

// Your Supabase credentials
const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

async function fixAuth() {
  const email = 'neilrayamajhi2008@gmail.com';

  console.log('=== Authentication Recovery Tool ===\n');
  console.log('Email:', email);
  console.log('\nChoose an option:');
  console.log('1. Test current password');
  console.log('2. Send password reset email');
  console.log('3. Create new account with same email (if user doesn\'t exist)');
  console.log('4. Check account status');
  console.log('5. Exit');

  const choice = await question('\nEnter your choice (1-5): ');

  switch(choice) {
    case '1':
      await testPassword(email);
      break;
    case '2':
      await sendPasswordReset(email);
      break;
    case '3':
      await createNewAccount(email);
      break;
    case '4':
      await checkAccountStatus(email);
      break;
    case '5':
      console.log('Exiting...');
      rl.close();
      return;
    default:
      console.log('Invalid choice');
  }

  // Ask if user wants to continue
  const continueChoice = await question('\nWould you like to try another option? (y/n): ');
  if (continueChoice.toLowerCase() === 'y') {
    await fixAuth();
  } else {
    rl.close();
  }
}

async function testPassword(email) {
  const password = await question('Enter your password: ');

  console.log('\nTesting authentication...');

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (error) {
    console.error('❌ Authentication failed:', error.message);

    if (error.message.includes('Invalid login credentials')) {
      console.log('\nThis could mean:');
      console.log('- The password is incorrect');
      console.log('- The user doesn\'t exist in the authentication system');
      console.log('- The email needs verification');
      console.log('\n💡 Try option 2 to reset your password');
    }
  } else {
    console.log('✅ Authentication successful!');
    console.log('User ID:', data.user.id);
    console.log('Email verified:', data.user.email_confirmed_at ? 'Yes' : 'No');

    // Sign out after test
    await supabase.auth.signOut();
  }
}

async function sendPasswordReset(email) {
  console.log('\nSending password reset email...');

  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'hou2ed://reset-password',
  });

  if (error) {
    console.error('❌ Failed to send reset email:', error.message);
  } else {
    console.log('✅ Password reset email sent!');
    console.log('Check your email inbox (and spam folder) for the reset link.');
    console.log('\nNote: The reset link will redirect to the app.');
    console.log('If you\'re testing on web, you can also use this URL format:');
    console.log(`${SUPABASE_URL}/auth/v1/verify?type=recovery&token=<token-from-email>`);
  }
}

async function createNewAccount(email) {
  console.log('\n⚠️  This will create a new account with the same email.');
  console.log('Only use this if the account doesn\'t exist in the auth system.');

  const confirm = await question('Are you sure you want to continue? (yes/no): ');
  if (confirm.toLowerCase() !== 'yes') {
    console.log('Cancelled.');
    return;
  }

  const password = await question('Enter a new password (min 8 characters): ');
  if (password.length < 8) {
    console.log('❌ Password must be at least 8 characters');
    return;
  }

  const username = await question('Enter a username: ');
  const fullName = await question('Enter your full name: ');

  console.log('\nCreating account...');

  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password,
    options: {
      data: {
        username: username,
        full_name: fullName,
        role: 'seeker'
      }
    }
  });

  if (error) {
    console.error('❌ Failed to create account:', error.message);

    if (error.message.includes('already registered')) {
      console.log('\n💡 The user already exists. Try password reset instead (option 2).');
    }
  } else {
    console.log('✅ Account created successfully!');
    console.log('User ID:', data.user?.id);
    console.log('\n📧 Check your email for the verification code.');
    console.log('You\'ll need to verify your email before you can log in.');
  }
}

async function checkAccountStatus(email) {
  console.log('\nChecking account status...\n');

  // Check profiles table
  console.log('1. Checking profiles table...');
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single();

  if (profileError) {
    if (profileError.message.includes('No rows')) {
      console.log('❌ No profile found for this email');
    } else {
      console.error('❌ Error checking profile:', profileError.message);
    }
  } else {
    console.log('✅ Profile found:');
    console.log('  - ID:', profile.id);
    console.log('  - Username:', profile.username);
    console.log('  - Role:', profile.role);
    console.log('  - Created:', new Date(profile.created_at).toLocaleString());
  }

  // Try to check if we can authenticate (this will fail but gives us info)
  console.log('\n2. Checking authentication status...');
  console.log('  - Cannot directly check auth.users table (requires admin access)');
  console.log('  - To verify if user exists in auth system, try option 1 (test password)');
  console.log('  - If password test fails, try option 2 (password reset)');

  console.log('\n💡 Recommendations:');
  if (profile) {
    console.log('  - Profile exists, so try password reset (option 2)');
    console.log('  - This will work even if you forgot your password');
  } else {
    console.log('  - No profile found, you may need to create a new account');
    console.log('  - Use option 3 to create a new account');
  }
}

// Run the tool
fixAuth().catch(console.error);