const { createClient } = require('@supabase/supabase-js');

// Your Supabase configuration
const supabaseUrl = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSignupConsistency(testNumber) {
  const testEmail = `consistency${Date.now()}${testNumber}@test.com`;
  const testUsername = `consistency${Date.now()}${testNumber}`;
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
          fullName: `Test User ${testNumber}`,
          username: testUsername,
          role: 'seeker',
        }),
      }
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const data = await response.json();

    return {
      success: data.success,
      duration: parseFloat(duration),
      email: testEmail,
      error: data.error
    };
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    return {
      success: false,
      duration: parseFloat(duration),
      error: error.message
    };
  }
}

async function runConsistencyTest() {
  console.log('🧪 CONSISTENCY TEST - 10 CONSECUTIVE SIGNUPS');
  console.log('============================================');
  console.log('Testing if the fix works consistently...\n');

  const results = [];
  const testCount = 10;

  console.log('Running tests:');
  for (let i = 1; i <= testCount; i++) {
    process.stdout.write(`  Test ${i}/${testCount}... `);
    const result = await testSignupConsistency(i);

    if (result.success) {
      console.log(`✅ ${result.duration}s`);
    } else {
      console.log(`❌ Failed: ${result.error}`);
    }

    results.push(result);

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Calculate statistics
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const durations = successful.map(r => r.duration);
  const avgDuration = durations.length > 0
    ? (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2)
    : 0;
  const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;
  const minDuration = durations.length > 0 ? Math.min(...durations) : 0;

  console.log('\n' + '='.repeat(50));
  console.log('📊 CONSISTENCY TEST RESULTS');
  console.log('='.repeat(50));
  console.log(`Total Tests: ${testCount}`);
  console.log(`Successful: ${successful.length} (${(successful.length/testCount*100).toFixed(0)}%)`);
  console.log(`Failed: ${failed.length}`);

  if (successful.length > 0) {
    console.log(`\nTiming Statistics:`);
    console.log(`  Average: ${avgDuration}s`);
    console.log(`  Fastest: ${minDuration}s`);
    console.log(`  Slowest: ${maxDuration}s`);
  }

  console.log('\n' + '='.repeat(50));

  if (successful.length === testCount && maxDuration < 5) {
    console.log('🎉 PERFECT CONSISTENCY!');
    console.log('   • All signups succeeded');
    console.log('   • All completed under 5 seconds');
    console.log('   • No timeouts or network errors');
    console.log('   • Average time: ' + avgDuration + 's');
    console.log('\n✅ THE FIX IS ROCK SOLID!');
  } else if (successful.length >= testCount * 0.8) {
    console.log('✅ GOOD CONSISTENCY');
    console.log('   • Most signups succeeded');
    console.log('   • Performance is reliable');
  } else {
    console.log('⚠️  SOME INCONSISTENCY DETECTED');
    console.log('   • Check network connection');
    console.log('   • May need to investigate further');
  }

  console.log('='.repeat(50));

  return successful.length === testCount;
}

// Run the consistency test
runConsistencyTest().catch(console.error);