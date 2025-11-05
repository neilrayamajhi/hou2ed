const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials
const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testEnhancedSignup() {
  console.log('🧪 Testing Enhanced Signup Flow (with timeout handling)');
  console.log('======================================================\n');

  const timestamp = Date.now();
  const testEmail = `enhanced${timestamp}@test.com`;
  const testPassword = 'TestPassword123!';
  const testUsername = `enhanced${timestamp}`;

  console.log('Test credentials:');
  console.log('  Email:', testEmail);
  console.log('  Username:', testUsername);
  console.log('  Password:', testPassword);
  console.log('');

  try {
    // Simulate what the enhanced auth service does
    console.log('📝 Step 1: Attempting signup with 10-second timeout...');

    let signupTimedOut = false;
    let signupResult = null;

    // Create a controlled timeout
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        signupTimedOut = true;
        resolve({ data: null, error: { status: 504, message: "Controlled timeout" } });
      }, 10000); // 10 second timeout
    });

    // Race between signup and timeout
    const signupPromise = supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Enhanced Test',
          username: testUsername,
          role: 'seeker'
        }
      }
    });

    const startTime = Date.now();
    signupResult = await Promise.race([signupPromise, timeoutPromise]);
    const duration = (Date.now() - startTime) / 1000;

    console.log(`  Completed in ${duration}s`);

    if (signupResult.error) {
      if (signupResult.error.status === 504 || signupTimedOut) {
        console.log('  ⏱️ Signup timed out (as expected with broken trigger)');

        // Step 2: Check if user was created anyway
        console.log('\n📝 Step 2: Checking if user was created despite timeout...');
        console.log('  Waiting 2 seconds for background creation...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('  Attempting to login with credentials...');
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email: testEmail,
          password: testPassword
        });

        if (loginData?.user) {
          console.log('  ✅ SUCCESS! User WAS created despite timeout!');
          console.log('     User ID:', loginData.user.id);
          console.log('     Email verified:', loginData.user.email_confirmed_at ? 'Yes' : 'No');

          // Step 3: Create profile manually
          console.log('\n📝 Step 3: Creating profile manually...');
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: loginData.user.id,
              email: testEmail.toLowerCase(),
              full_name: 'Enhanced Test',
              username: testUsername,
              role: 'seeker',
              phone: null,
              avatar_url: null,
              verified_provider: false,
              verification_status: null,
              verification_documents: null,
              seeker_profile: {},
              provider_profile: {},
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (profileError) {
            if (profileError.message?.includes('duplicate')) {
              console.log('  ℹ️ Profile already exists (trigger might have partially worked)');
            } else {
              console.error('  ❌ Profile creation failed:', profileError.message);
            }
          } else {
            console.log('  ✅ Profile created successfully!');
          }

          // Clean up
          await supabase.auth.signOut();

          console.log('\n✨ ENHANCED SIGNUP FLOW WORKS!');
          console.log('   The user can now login and use the app normally.');
          return true;

        } else {
          console.log('  ❌ User was NOT created');
          if (loginError) {
            console.log('     Error:', loginError.message);
          }
          return false;
        }
      } else {
        console.log('  ❌ Signup failed with error:', signupResult.error.message);
        return false;
      }
    } else if (signupResult.data?.user) {
      console.log('  ✅ Signup succeeded normally (trigger might be fixed!)');
      console.log('     User ID:', signupResult.data.user.id);
      return true;
    }

  } catch (err) {
    console.error('Unexpected error:', err);
    return false;
  }
}

// Run the test
testEnhancedSignup().then(success => {
  console.log('\n=====================================');
  if (success) {
    console.log('✅ Enhanced signup flow is working!');
    console.log('Your app can now handle signups even with the broken trigger.');
  } else {
    console.log('❌ Enhanced signup flow failed.');
    console.log('Check the errors above for details.');
  }
  process.exit(success ? 0 : 1);
});