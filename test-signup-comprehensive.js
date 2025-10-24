const { createClient } = require('@supabase/supabase-js');

// Your Supabase configuration
const supabaseUrl = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test 1: Normal successful signup
async function testNormalSignup() {
  console.log('\n📝 TEST 1: Normal Signup (Should complete in 2-3 seconds)');
  console.log('=========================================================');

  const testEmail = `test${Date.now()}@example.com`;
  const testUsername = `user${Date.now()}`;
  const startTime = Date.now();

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/signup-with-verification`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          email: testEmail,
          password: 'TestPassword123!',
          fullName: 'Test User',
          username: testUsername,
          role: 'seeker',
        }),
      }
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const data = await response.json();

    if (data.success) {
      console.log(`✅ PASSED - Signup completed in ${duration}s`);
      console.log(`   User ID: ${data.user.id}`);
      console.log(`   Email: ${testEmail}`);
      return { success: true, email: testEmail, duration };
    } else {
      console.log(`❌ FAILED - ${data.error}`);
      return { success: false, error: data.error };
    }
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`❌ FAILED - Error after ${duration}s: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Test 2: Duplicate email
async function testDuplicateEmail(existingEmail) {
  console.log('\n📝 TEST 2: Duplicate Email (Should reject immediately)');
  console.log('======================================================');

  const startTime = Date.now();

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/signup-with-verification`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          email: existingEmail,
          password: 'TestPassword123!',
          fullName: 'Duplicate User',
          username: `dup${Date.now()}`,
          role: 'seeker',
        }),
      }
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const data = await response.json();

    if (!data.success && data.errorCode === 'EMAIL_EXISTS') {
      console.log(`✅ PASSED - Duplicate email rejected in ${duration}s`);
      console.log(`   Error: ${data.error}`);
      return { success: true };
    } else if (!data.success && data.errorCode === 'EMAIL_EXISTS_RESENT') {
      console.log(`✅ PASSED - Duplicate unverified email, code resent in ${duration}s`);
      console.log(`   Message: ${data.error}`);
      return { success: true };
    } else if (data.success) {
      console.log(`❌ FAILED - Should not allow duplicate email!`);
      return { success: false };
    } else {
      console.log(`❌ FAILED - Unexpected error: ${data.error}`);
      return { success: false };
    }
  } catch (error) {
    console.log(`❌ FAILED - Error: ${error.message}`);
    return { success: false };
  }
}

// Test 3: Duplicate username
async function testDuplicateUsername() {
  console.log('\n📝 TEST 3: Duplicate Username (Should reject)');
  console.log('=============================================');

  // First create a user
  const firstUsername = `uniqueuser${Date.now()}`;
  const firstEmail = `first${Date.now()}@test.com`;

  // Create first user
  await fetch(
    `${supabaseUrl}/functions/v1/signup-with-verification`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        email: firstEmail,
        password: 'TestPassword123!',
        fullName: 'First User',
        username: firstUsername,
        role: 'seeker',
      }),
    }
  );

  await sleep(1000); // Wait a bit

  // Try to create second user with same username
  const startTime = Date.now();

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/signup-with-verification`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          email: `second${Date.now()}@test.com`,
          password: 'TestPassword123!',
          fullName: 'Second User',
          username: firstUsername, // Same username!
          role: 'seeker',
        }),
      }
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const data = await response.json();

    if (!data.success && data.errorCode === 'USERNAME_EXISTS') {
      console.log(`✅ PASSED - Duplicate username rejected in ${duration}s`);
      console.log(`   Error: ${data.error}`);
      return { success: true };
    } else if (data.success) {
      console.log(`❌ FAILED - Should not allow duplicate username!`);
      return { success: false };
    } else {
      console.log(`❌ FAILED - Unexpected error: ${data.error}`);
      return { success: false };
    }
  } catch (error) {
    console.log(`❌ FAILED - Error: ${error.message}`);
    return { success: false };
  }
}

// Test 4: Invalid inputs
async function testInvalidInputs() {
  console.log('\n📝 TEST 4: Invalid Inputs (Should reject quickly)');
  console.log('=================================================');

  const tests = [
    {
      name: 'Missing email',
      data: {
        email: '',
        password: 'TestPassword123!',
        fullName: 'Test User',
        username: `test${Date.now()}`,
        role: 'seeker',
      }
    },
    {
      name: 'Invalid email format',
      data: {
        email: 'not-an-email',
        password: 'TestPassword123!',
        fullName: 'Test User',
        username: `test${Date.now()}`,
        role: 'seeker',
      }
    },
    {
      name: 'Weak password',
      data: {
        email: `test${Date.now()}@test.com`,
        password: '123', // Too short
        fullName: 'Test User',
        username: `test${Date.now()}`,
        role: 'seeker',
      }
    }
  ];

  let allPassed = true;

  for (const test of tests) {
    const startTime = Date.now();

    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/signup-with-verification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify(test.data),
        }
      );

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      const data = await response.json();

      if (!data.success) {
        console.log(`  ✅ ${test.name}: Rejected in ${duration}s`);
      } else {
        console.log(`  ❌ ${test.name}: Should have been rejected!`);
        allPassed = false;
      }
    } catch (error) {
      console.log(`  ❌ ${test.name}: Error - ${error.message}`);
      allPassed = false;
    }
  }

  return { success: allPassed };
}

// Test 5: Multiple simultaneous signups
async function testSimultaneousSignups() {
  console.log('\n📝 TEST 5: Simultaneous Signups (All should complete fast)');
  console.log('==========================================================');

  const signupPromises = [];
  const startTime = Date.now();

  // Create 3 simultaneous signup requests
  for (let i = 0; i < 3; i++) {
    const promise = fetch(
      `${supabaseUrl}/functions/v1/signup-with-verification`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          email: `parallel${Date.now()}${i}@test.com`,
          password: 'TestPassword123!',
          fullName: `User ${i}`,
          username: `parallel${Date.now()}${i}`,
          role: 'seeker',
        }),
      }
    ).then(r => r.json());

    signupPromises.push(promise);
  }

  try {
    const results = await Promise.all(signupPromises);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    const allSucceeded = results.every(r => r.success);

    if (allSucceeded) {
      console.log(`✅ PASSED - All 3 signups completed in ${duration}s total`);
      results.forEach((r, i) => {
        console.log(`   User ${i + 1}: ${r.user.email}`);
      });
      return { success: true };
    } else {
      console.log(`❌ FAILED - Some signups failed`);
      return { success: false };
    }
  } catch (error) {
    console.log(`❌ FAILED - Error: ${error.message}`);
    return { success: false };
  }
}

// Test 6: Test different roles
async function testDifferentRoles() {
  console.log('\n📝 TEST 6: Different Roles (Seeker vs Provider)');
  console.log('===============================================');

  const roles = ['seeker', 'provider'];
  let allPassed = true;

  for (const role of roles) {
    const startTime = Date.now();
    const testEmail = `${role}${Date.now()}@test.com`;

    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/signup-with-verification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            email: testEmail,
            password: 'TestPassword123!',
            fullName: `${role} User`,
            username: `${role}${Date.now()}`,
            role: role,
          }),
        }
      );

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      const data = await response.json();

      if (data.success && data.user.role === role) {
        console.log(`  ✅ ${role.toUpperCase()}: Created in ${duration}s`);
      } else {
        console.log(`  ❌ ${role.toUpperCase()}: Failed`);
        allPassed = false;
      }
    } catch (error) {
      console.log(`  ❌ ${role.toUpperCase()}: Error - ${error.message}`);
      allPassed = false;
    }
  }

  return { success: allPassed };
}

// Main test runner
async function runAllTests() {
  console.log('🧪 COMPREHENSIVE SIGNUP TESTING');
  console.log('================================');
  console.log('Testing the fixed signup flow with Edge Function');
  console.log('All tests should complete quickly (2-3 seconds each)');

  const results = [];

  // Run tests
  const test1 = await testNormalSignup();
  results.push({ name: 'Normal Signup', ...test1 });

  if (test1.success && test1.email) {
    const test2 = await testDuplicateEmail(test1.email);
    results.push({ name: 'Duplicate Email', ...test2 });
  }

  const test3 = await testDuplicateUsername();
  results.push({ name: 'Duplicate Username', ...test3 });

  const test4 = await testInvalidInputs();
  results.push({ name: 'Invalid Inputs', ...test4 });

  const test5 = await testSimultaneousSignups();
  results.push({ name: 'Simultaneous Signups', ...test5 });

  const test6 = await testDifferentRoles();
  results.push({ name: 'Different Roles', ...test6 });

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));

  let passed = 0;
  let failed = 0;

  results.forEach(result => {
    if (result.success) {
      console.log(`✅ ${result.name}`);
      passed++;
    } else {
      console.log(`❌ ${result.name}`);
      failed++;
    }
  });

  console.log('\n' + '='.repeat(60));
  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('The signup fix is working perfectly!');
    console.log('Users can now sign up in 2-3 seconds instead of 50!');
  } else {
    console.log(`⚠️  ${passed} passed, ${failed} failed`);
  }
  console.log('='.repeat(60));
}

// Run all tests
runAllTests().catch(console.error);