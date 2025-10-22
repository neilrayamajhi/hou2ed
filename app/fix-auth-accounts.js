const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

const supabaseUrl = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

async function fixAccount(email) {
  console.log(`\n=== FIXING ACCOUNT: ${email} ===\n`);

  // Step 1: Check if profile exists
  console.log('Checking profile...');
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (profile) {
    console.log('✅ Profile exists:');
    console.log('  - Username:', profile.username);
    console.log('  - Role:', profile.role);
  } else {
    console.log('❌ No profile found - will need to create one after authentication');
  }

  // Step 2: Send OTP code for authentication
  console.log('\nSending OTP code to email...');
  const { error: otpError } = await supabase.auth.signInWithOtp({
    email: email,
    options: {
      shouldCreateUser: false // Don't create new user if doesn't exist
    }
  });

  if (otpError) {
    console.log('❌ Failed to send OTP:', otpError.message);
    if (otpError.message.includes('security purposes')) {
      console.log('⏰ Please wait 60 seconds before trying again');
    }
    return false;
  }

  console.log('✅ OTP code sent! Check your email for a 6-digit code.');

  // Step 3: Get OTP code from user
  const otpCode = await question('Enter the 6-digit OTP code from your email: ');

  if (!otpCode || otpCode.length !== 6) {
    console.log('❌ Invalid code format. Must be 6 digits.');
    return false;
  }

  // Step 4: Verify OTP and sign in
  console.log('\nVerifying OTP code...');
  const { data: authData, error: verifyError } = await supabase.auth.verifyOtp({
    email: email,
    token: otpCode,
    type: 'magiclink' // Use magiclink type for email OTP
  });

  if (verifyError) {
    console.log('❌ Verification failed:', verifyError.message);
    return false;
  }

  if (!authData?.user) {
    console.log('❌ No user data returned');
    return false;
  }

  console.log('✅ Successfully authenticated!');
  console.log('  - User ID:', authData.user.id);
  console.log('  - Email verified:', authData.user.email_confirmed_at ? 'Yes' : 'No');

  // Step 5: Create profile if it doesn't exist
  if (!profile) {
    console.log('\nCreating profile...');
    const username = await question('Enter a username for your profile: ');
    const role = await question('Enter role (seeker/provider): ');

    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: email,
        username: username.trim(),
        role: role === 'provider' ? 'provider' : 'seeker',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.log('❌ Failed to create profile:', createError.message);
      if (createError.message.includes('duplicate')) {
        console.log('Username already taken. Try a different one.');
      }
    } else {
      console.log('✅ Profile created successfully!');
    }
  }

  // Step 6: Set a new password
  console.log('\nSetting up password authentication...');
  const newPassword = await question('Enter a new password (min 6 characters): ');

  if (newPassword.length < 6) {
    console.log('❌ Password must be at least 6 characters');
    return false;
  }

  const { error: passwordError } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (passwordError) {
    console.log('❌ Failed to set password:', passwordError.message);
    return false;
  }

  console.log('✅ Password set successfully!');

  // Step 7: Test the new password
  console.log('\nTesting password login...');
  await supabase.auth.signOut();

  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: email,
    password: newPassword
  });

  if (loginError) {
    console.log('❌ Password login test failed:', loginError.message);
    return false;
  }

  console.log('✅ Password login works!');
  console.log('\n🎉 ACCOUNT FIXED SUCCESSFULLY!');
  console.log('You can now log in with:');
  console.log('  - Email:', email);
  console.log('  - Password:', newPassword);

  // Sign out after fixing
  await supabase.auth.signOut();
  return true;
}

async function main() {
  console.log('=== FIX AUTHENTICATION ACCOUNTS ===\n');
  console.log('This tool will help you fix accounts that can\'t log in with passwords.\n');
  console.log('Known accounts with issues:');
  console.log('1. neilrayamajhi34@gmail.com (has profile)');
  console.log('2. n42411@student.ghctk12.com (has profile)');
  console.log('3. neilrayamajhi2008@gmail.com (no profile)');
  console.log('4. Enter custom email\n');

  const choice = await question('Select account to fix (1-4): ');

  let email;
  switch(choice) {
    case '1':
      email = 'neilrayamajhi34@gmail.com';
      break;
    case '2':
      email = 'n42411@student.ghctk12.com';
      break;
    case '3':
      email = 'neilrayamajhi2008@gmail.com';
      break;
    case '4':
      email = await question('Enter email address: ');
      break;
    default:
      console.log('Invalid choice');
      rl.close();
      return;
  }

  await fixAccount(email);

  const another = await question('\nFix another account? (y/n): ');
  if (another.toLowerCase() === 'y') {
    await main();
  } else {
    console.log('\nGoodbye!');
    rl.close();
  }
}

// Run the fix tool
main().catch(error => {
  console.error('Error:', error);
  rl.close();
});