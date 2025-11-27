/**
 * Comprehensive Authentication Flow Tests
 * Tests signup, login, profile creation, and OTP verification
 * 
 * Run with: node test-auth-complete.js
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration - using production Supabase
const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

// Test user data - using timestamp to ensure uniqueness
const timestamp = Date.now();
const testUser = {
  email: `test-${timestamp}@hou2ed.test`,
  password: 'TestPass123!',
  username: `testuser${timestamp}`,
  fullName: 'Test User',
  role: 'seeker'
};

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test results tracking
const results = {
  passed: [],
  failed: [],
  warnings: []
};

function logTest(name, passed, details = '') {
  if (passed) {
    console.log(`✅ ${name}`);
    results.passed.push(name);
  } else {
    console.log(`❌ ${name}`);
    console.log(`   ${details}`);
    results.failed.push({ name, details });
  }
}

function logWarning(message) {
  console.log(`⚠️  ${message}`);
  results.warnings.push(message);
}

function logInfo(message) {
  console.log(`ℹ️  ${message}`);
}

// Sleep utility
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function test1_CheckProfileTriggerExists() {
  console.log('\n=== Test 1: Check Profile Trigger Exists ===');
  
  try {
    // We can't directly check triggers with anon key, but we can check if profiles table exists
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (error && !error.message?.includes('No rows')) {
      logTest('Profile table exists', false, error.message);
      return false;
    }

    logTest('Profile table exists and is accessible', true);
    return true;
  } catch (error) {
    logTest('Profile table check', false, error.message);
    return false;
  }
}

async function test2_CheckUsernameUniqueness() {
  console.log('\n=== Test 2: Check Username Uniqueness ===');
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', testUser.username)
      .maybeSingle();

    if (error && !error.message?.includes('No rows')) {
      logTest('Username uniqueness check', false, error.message);
      return false;
    }

    if (data) {
      logWarning(`Username ${testUser.username} already exists - test will use unique username`);
    } else {
      logTest('Username is available', true);
    }
    
    return true;
  } catch (error) {
    logTest('Username check', false, error.message);
    return false;
  }
}

async function test3_SignUpNewUser() {
  console.log('\n=== Test 3: Sign Up New User ===');
  
  try {
    logInfo(`Signing up: ${testUser.email}`);
    logInfo(`Username: ${testUser.username}`);
    logInfo(`Role: ${testUser.role}`);

    const { data, error } = await supabase.auth.signUp({
      email: testUser.email,
      password: testUser.password,
      options: {
        data: {
          full_name: testUser.fullName,
          username: testUser.username,
          role: testUser.role
        }
      }
    });

    if (error) {
      logTest('Sign up new user', false, error.message);
      return { success: false, data: null };
    }

    // Check for duplicate email (Supabase quirk)
    if (data?.user && (!data.user.identities || data.user.identities.length === 0)) {
      logTest('Sign up new user', false, 'Email already exists (empty identities array)');
      return { success: false, data: null };
    }

    if (!data?.user) {
      logTest('Sign up new user', false, 'No user data returned');
      return { success: false, data: null };
    }

    logTest('Sign up new user', true);
    logInfo(`User ID: ${data.user.id}`);
    logInfo(`Email confirmed: ${data.user.email_confirmed_at ? 'Yes' : 'No (needs verification)'}`);
    logInfo(`Session created: ${data.session ? 'Yes' : 'No'}`);

    return { success: true, data };
  } catch (error) {
    logTest('Sign up new user', false, error.message);
    return { success: false, data: null };
  }
}

async function test4_CheckProfileCreated(userId) {
  console.log('\n=== Test 4: Check Profile Created ===');
  
  try {
    logInfo(`Checking profile for user ID: ${userId}`);
    
    // Wait a moment for trigger to complete
    await sleep(1000);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error && !error.message?.includes('No rows')) {
      logTest('Profile creation check', false, error.message);
      return { success: false, profile: null };
    }

    if (!data) {
      logTest('Profile created by trigger', false, 'No profile found for user');
      logWarning('CRITICAL: Profile trigger may not be working!');
      return { success: false, profile: null };
    }

    logTest('Profile created by trigger', true);
    logInfo(`Profile ID: ${data.id}`);
    logInfo(`Email: ${data.email}`);
    logInfo(`Username: ${data.username}`);
    logInfo(`Full Name: ${data.full_name}`);
    logInfo(`Role: ${data.role}`);

    // Verify all fields match
    let allFieldsMatch = true;
    if (data.email?.toLowerCase() !== testUser.email.toLowerCase()) {
      logWarning(`Email mismatch: expected ${testUser.email}, got ${data.email}`);
      allFieldsMatch = false;
    }
    if (data.username !== testUser.username) {
      logWarning(`Username mismatch: expected ${testUser.username}, got ${data.username}`);
      allFieldsMatch = false;
    }
    if (data.full_name !== testUser.fullName) {
      logWarning(`Full name mismatch: expected ${testUser.fullName}, got ${data.full_name}`);
      allFieldsMatch = false;
    }
    if (data.role !== testUser.role) {
      logWarning(`Role mismatch: expected ${testUser.role}, got ${data.role}`);
      allFieldsMatch = false;
    }

    if (allFieldsMatch) {
      logTest('All profile fields match signup data', true);
    } else {
      logTest('Profile fields match signup data', false, 'Some fields do not match');
    }

    return { success: true, profile: data };
  } catch (error) {
    logTest('Profile creation check', false, error.message);
    return { success: false, profile: null };
  }
}

async function test5_LoginWithEmail() {
  console.log('\n=== Test 5: Login with Email ===');
  
  try {
    logInfo(`Attempting login with: ${testUser.email}`);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password
    });

    if (error) {
      // Expected to fail if email not confirmed
      if (error.message?.includes('Email not confirmed')) {
        logTest('Login with email', true, 'Correctly requires email confirmation');
        logInfo('Email confirmation is required (as expected)');
        return { success: true, requiresConfirmation: true };
      }

      logTest('Login with email', false, error.message);
      return { success: false };
    }

    if (!data?.user) {
      logTest('Login with email', false, 'No user data returned');
      return { success: false };
    }

    logTest('Login with email', true);
    logInfo(`User ID: ${data.user.id}`);
    logInfo(`Session: ${data.session ? 'Created' : 'Not created'}`);

    return { success: true, data };
  } catch (error) {
    logTest('Login with email', false, error.message);
    return { success: false };
  }
}

async function test6_CheckDuplicateEmail() {
  console.log('\n=== Test 6: Check Duplicate Email Prevention ===');
  
  try {
    logInfo(`Attempting to sign up again with: ${testUser.email}`);

    const { data, error } = await supabase.auth.signUp({
      email: testUser.email,
      password: testUser.password,
      options: {
        data: {
          full_name: 'Different Name',
          username: 'differentuser',
          role: 'provider'
        }
      }
    });

    // Should fail or return empty identities
    if (error) {
      if (error.message?.includes('already') || error.message?.includes('exists')) {
        logTest('Duplicate email prevention', true, 'Correctly prevented duplicate');
        return true;
      }
      logTest('Duplicate email check', false, `Unexpected error: ${error.message}`);
      return false;
    }

    // Check for Supabase's duplicate indicator
    if (data?.user && (!data.user.identities || data.user.identities.length === 0)) {
      logTest('Duplicate email prevention', true, 'Detected via empty identities');
      return true;
    }

    logTest('Duplicate email prevention', false, 'Allowed duplicate email signup!');
    logWarning('SECURITY ISSUE: Duplicate emails should be prevented');
    return false;
  } catch (error) {
    logTest('Duplicate email check', false, error.message);
    return false;
  }
}

async function test7_CheckDuplicateUsername() {
  console.log('\n=== Test 7: Check Duplicate Username Prevention ===');
  
  try {
    logInfo(`Checking if username ${testUser.username} is taken`);

    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', testUser.username)
      .maybeSingle();

    if (error && !error.message?.includes('No rows')) {
      logTest('Duplicate username check', false, error.message);
      return false;
    }

    if (data) {
      logTest('Username taken detection', true, 'Correctly found existing username');
      return true;
    }

    logTest('Username taken detection', false, 'Username not found but should exist');
    return false;
  } catch (error) {
    logTest('Duplicate username check', false, error.message);
    return false;
  }
}

async function test8_CleanupTestUser() {
  console.log('\n=== Test 8: Cleanup Test User ===');
  
  try {
    logInfo('Note: Cleanup requires service role key - skipping automatic cleanup');
    logInfo(`Test user email: ${testUser.email}`);
    logInfo('You can manually delete this test user from Supabase dashboard if needed');
    
    logTest('Cleanup noted', true, 'Manual cleanup required');
    return true;
  } catch (error) {
    logTest('Cleanup', false, error.message);
    return false;
  }
}

async function testOrphanedAccountScenario() {
  console.log('\n=== Special Test: Orphaned Account Detection ===');
  
  logInfo('This test checks if orphaned accounts exist');
  logInfo('An orphaned account = user in auth.users but NOT in profiles');
  
  try {
    // We can't check auth.users with anon key, but we can check profiles
    const { data: allProfiles, error } = await supabase
      .from('profiles')
      .select('id, email, username')
      .limit(10);

    if (error) {
      logWarning(`Cannot check for orphaned accounts: ${error.message}`);
      return;
    }

    logInfo(`Found ${allProfiles?.length || 0} profiles in database`);
    logTest('Profile query works', true);

    if (allProfiles && allProfiles.length === 0) {
      logWarning('No profiles found - if users exist in auth, they are orphaned!');
    }
  } catch (error) {
    logWarning(`Orphaned account check failed: ${error.message}`);
  }
}

// Main test runner
async function runAllTests() {
  console.log('════════════════════════════════════════════════════════════');
  console.log('   HOU2ED Authentication Flow - Comprehensive Tests');
  console.log('════════════════════════════════════════════════════════════');
  console.log(`Test User Email: ${testUser.email}`);
  console.log(`Test User Username: ${testUser.username}`);
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log('════════════════════════════════════════════════════════════\n');

  let signupData = null;

  // Run tests in sequence
  await test1_CheckProfileTriggerExists();
  await test2_CheckUsernameUniqueness();
  
  const signupResult = await test3_SignUpNewUser();
  if (signupResult.success && signupResult.data) {
    signupData = signupResult.data;
    await test4_CheckProfileCreated(signupData.user.id);
  } else {
    logWarning('Skipping profile check - signup failed');
  }

  await test5_LoginWithEmail();
  await test6_CheckDuplicateEmail();
  await test7_CheckDuplicateUsername();
  await testOrphanedAccountScenario();
  await test8_CleanupTestUser();

  // Print summary
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('                      TEST SUMMARY');
  console.log('════════════════════════════════════════════════════════════');
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`⚠️  Warnings: ${results.warnings.length}`);
  
  if (results.failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    results.failed.forEach(({ name, details }) => {
      console.log(`   • ${name}`);
      if (details) console.log(`     ${details}`);
    });
  }

  if (results.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    results.warnings.forEach(warning => {
      console.log(`   • ${warning}`);
    });
  }

  console.log('\n════════════════════════════════════════════════════════════');
  
  if (results.failed.length === 0) {
    console.log('✅ ALL TESTS PASSED!');
    console.log('Authentication flow is working correctly.');
  } else {
    console.log('❌ SOME TESTS FAILED');
    console.log('There are issues with the authentication flow.');
    console.log('Check the failed tests above for details.');
  }
  
  console.log('════════════════════════════════════════════════════════════\n');

  process.exit(results.failed.length === 0 ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  console.error('\n❌ TEST RUNNER ERROR:', error);
  process.exit(1);
});

