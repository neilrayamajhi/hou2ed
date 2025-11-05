const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials
const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testProviderSignup() {
  // Generate a unique test email
  const timestamp = Date.now();
  const testEmail = `testprovider${timestamp}@gmail.com`;
  const testUsername = `provider${timestamp}`;
  const testPassword = 'TestPassword123!';

  console.log('🧪 Testing Provider Account Creation');
  console.log('=====================================\n');
  console.log('Test Email:', testEmail);
  console.log('Test Username:', testUsername);
  console.log('Role: provider');

  try {
    // Step 1: Create the account
    console.log('\n📝 Step 1: Creating provider account...');
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test Provider',
          username: testUsername,
          role: 'provider'  // Explicitly setting provider role
        },
        // No emailRedirectTo - this should trigger OTP email
      }
    });

    if (error) {
      console.error('❌ Signup failed:', error.message);
      console.error('Error details:', error);
      process.exit(1);
    }

    console.log('✅ Account created successfully!');

    if (data.user) {
      console.log('\n📊 User Details:');
      console.log('  - User ID:', data.user.id);
      console.log('  - Email:', data.user.email);
      console.log('  - Role in metadata:', data.user.user_metadata?.role);
      console.log('  - Username in metadata:', data.user.user_metadata?.username);
      console.log('  - Email confirmed:', data.user.email_confirmed_at ? 'Yes' : 'No');
      console.log('  - Confirmation sent at:', data.user.confirmation_sent_at);
    }

    if (data.session) {
      console.log('\n🔐 Session created:', 'Yes');
      console.log('  - Can login immediately without verification');
    } else {
      console.log('\n🔐 Session created:', 'No');
      console.log('  - Email verification required before login');
    }

    // Step 2: Check if the user is in profiles table
    console.log('\n📝 Step 2: Checking profiles table...');

    // Wait a second for the trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', testEmail)
      .single();

    if (profileError) {
      if (profileError.message.includes('No rows')) {
        console.log('⚠️  Profile not found in profiles table');
        console.log('   This might mean the trigger didn\'t run or failed');
      } else {
        console.error('❌ Error checking profile:', profileError.message);
      }
    } else if (profile) {
      console.log('✅ Profile found in profiles table:');
      console.log('  - Profile ID:', profile.id);
      console.log('  - Role:', profile.role);
      console.log('  - Username:', profile.username);
    }

    // Step 3: Check email status
    console.log('\n📧 Step 3: Email Status:');
    if (data.user?.confirmation_sent_at) {
      console.log('✅ Confirmation email was sent at:', new Date(data.user.confirmation_sent_at).toLocaleString());
      console.log('\n📬 Check your email for:');
      console.log('  1. A 6-digit verification code');
      console.log('  2. Check spam/junk folder if not in inbox');
      console.log('  3. The email comes from Supabase');
    } else {
      console.log('⚠️  No confirmation email timestamp found');
      console.log('   The email might not have been sent');
    }

    console.log('\n📋 Summary:');
    console.log('  - Provider account created: ✅');
    console.log('  - Role set to provider:', data.user?.user_metadata?.role === 'provider' ? '✅' : '❌');
    console.log('  - Email sent:', data.user?.confirmation_sent_at ? '✅' : '⚠️');

    console.log('\n💡 Next Steps:');
    console.log('  1. Check email (including spam) for verification code');
    console.log('  2. Enter the 6-digit code in the app');
    console.log('  3. After verification, login with:');
    console.log('     Email:', testEmail);
    console.log('     Password:', testPassword);

  } catch (err) {
    console.error('Unexpected error:', err);
  }

  process.exit(0);
}

testProviderSignup();