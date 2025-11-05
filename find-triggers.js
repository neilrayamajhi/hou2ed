const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials
const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4OTg4NiwiZXhwIjoyMDczOTY1ODg2fQ.J9Oc77ZR1E435SqDsngt8ey4_WVOeTE6UASlYo17Gbc';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function findTriggers() {
  console.log('🔍 Finding Database Triggers on auth.users');
  console.log('==========================================\n');

  try {
    // Query to find all triggers on auth.users table
    const { data: triggers, error: triggerError } = await supabase
      .rpc('get_triggers_info', {}, {
        get: true
      })
      .single();

    // If RPC doesn't exist, try direct query
    if (triggerError) {
      console.log('Using alternative method to find triggers...\n');

      // Check if there's a handle_new_user function
      const { data: functions, error: funcError } = await supabase
        .from('pg_proc')
        .select('proname')
        .ilike('proname', '%user%')
        .limit(10);

      if (funcError) {
        console.log('Cannot query pg_proc directly. Checking known patterns...\n');

        // Try to test if common trigger functions exist
        console.log('Testing common trigger patterns:\n');

        // Test 1: Try to call handle_new_user if it exists
        const testFunctions = [
          'handle_new_user',
          'create_profile_for_user',
          'on_auth_user_created',
          'create_user_profile'
        ];

        for (const funcName of testFunctions) {
          console.log(`Testing if ${funcName} exists...`);
          try {
            const { error } = await supabase.rpc(funcName, {});
            if (!error) {
              console.log(`  ✅ Found function: ${funcName}`);
            } else if (error.message.includes('not exist')) {
              console.log(`  ❌ Not found: ${funcName}`);
            } else {
              console.log(`  ⚠️ Exists but has error: ${error.message}`);
            }
          } catch (e) {
            // Function doesn't exist
          }
        }
      } else {
        console.log('Functions that might be triggers:', functions);
      }
    } else {
      console.log('Triggers found:', triggers);
    }

    // Check profiles table for any issues
    console.log('\n📝 Checking profiles table...');
    const { count, error: countError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.log('❌ Error accessing profiles table:', countError.message);
      console.log('This might be causing the signup timeout!');
    } else {
      console.log(`✅ Profiles table accessible. Total profiles: ${count}`);
    }

    // Check if we can insert into profiles directly
    console.log('\n🧪 Testing direct profile creation...');
    const testId = 'test-' + Date.now();
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: testId,
        email: `test${Date.now()}@test.com`,
        username: `test${Date.now()}`,
        role: 'seeker'
      });

    if (insertError) {
      console.log('❌ Cannot insert into profiles:', insertError.message);
      if (insertError.message.includes('violates')) {
        console.log('   This indicates a constraint issue that might hang triggers');
      }
    } else {
      console.log('✅ Direct profile creation works');

      // Clean up test profile
      await supabase.from('profiles').delete().eq('id', testId);
    }

  } catch (err) {
    console.error('Error:', err);
  }

  console.log('\n📋 Diagnosis Summary:');
  console.log('====================');
  console.log('The 504 timeout is likely caused by:');
  console.log('1. A trigger on auth.users that tries to insert into profiles');
  console.log('2. The trigger might be failing due to constraints or RLS policies');
  console.log('3. The trigger keeps retrying or waiting, causing the timeout');
  console.log('\nTo fix: Disable the trigger or fix the profiles table constraints');

  process.exit(0);
}

findTriggers();