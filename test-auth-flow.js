const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials
const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testAuthFlow() {
  console.log('🔍 Testing Authentication Flow Issues');
  console.log('=====================================\n');

  const timestamp = Date.now();
  const testEmail = `testauth${timestamp}@gmail.com`;
  const testPassword = 'TestPassword123!';

  console.log('Test Email:', testEmail);
  console.log('Test Password:', testPassword);

  try {
    // Test 1: Direct Signup
    console.log('\n📝 Test 1: Direct Signup...');
    console.time('Signup Time');

    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test User',
          username: `testuser${timestamp}`,
          role: 'seeker'
        }
      }
    });

    console.timeEnd('Signup Time');

    if (signupError) {
      console.error('❌ Signup failed:', signupError.message);
      console.error('Error code:', signupError.code);
      console.error('Full error:', JSON.stringify(signupError, null, 2));
    } else if (signupData?.user) {
      console.log('✅ Signup succeeded');
      console.log('User ID:', signupData.user.id);
      console.log('Email confirmed:', signupData.user.email_confirmed_at ? 'Yes' : 'No');
      console.log('Confirmation sent:', signupData.user.confirmation_sent_at ? 'Yes' : 'No');
      console.log('Identities:', signupData.user.identities?.length || 0);
    }

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Direct Login (will fail if not verified)
    console.log('\n📝 Test 2: Direct Login (before verification)...');
    console.time('Login Time');

    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    console.timeEnd('Login Time');

    if (loginError) {
      console.log('❌ Login failed (expected if email not verified):', loginError.message);
    } else if (loginData?.user) {
      console.log('✅ Login succeeded (unexpected!)');
      console.log('User ID:', loginData.user.id);
    }

    // Test 3: Password Reset Flow
    console.log('\n📝 Test 3: Password Reset Flow...');
    console.time('Reset Time');

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(testEmail);

    console.timeEnd('Reset Time');

    if (resetError) {
      console.error('❌ Reset failed:', resetError.message);
    } else {
      console.log('✅ Reset email sent');
    }

    // Test 4: Check Supabase Connection
    console.log('\n📝 Test 4: Testing Supabase Connection...');
    console.time('Connection Test');

    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    console.timeEnd('Connection Test');

    if (testError) {
      console.error('❌ Database connection failed:', testError.message);
    } else {
      console.log('✅ Database connection working');
    }

    // Test 5: Check if it's a network/timeout issue
    console.log('\n📝 Test 5: Testing with shorter timeout...');

    const quickClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        fetch: (url, options = {}) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

          return fetch(url, {
            ...options,
            signal: controller.signal,
          }).finally(() => {
            clearTimeout(timeoutId);
          });
        }
      }
    });

    console.time('Quick Signup Time');

    const testEmail2 = `quicktest${timestamp}@gmail.com`;
    const { data: quickData, error: quickError } = await quickClient.auth.signUp({
      email: testEmail2,
      password: testPassword
    });

    console.timeEnd('Quick Signup Time');

    if (quickError) {
      console.error('❌ Quick signup failed:', quickError.message);
      if (quickError.message.includes('aborted')) {
        console.error('⚠️ TIMEOUT DETECTED - Network too slow');
      }
    } else if (quickData?.user) {
      console.log('✅ Quick signup succeeded');
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }

  console.log('\n\n📊 Analysis:');
  console.log('============');
  console.log('If signup is timing out but password reset works, possible causes:');
  console.log('1. Signup has additional validation/triggers that are slow');
  console.log('2. Network issue specific to signup endpoint');
  console.log('3. Supabase rate limiting on signup but not on password reset');
  console.log('4. Database trigger on user creation is hanging');

  process.exit(0);
}

testAuthFlow();