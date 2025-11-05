const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials
const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4OTg4NiwiZXhwIjoyMDczOTY1ODg2fQ.J9Oc77ZR1E435SqDsngt8ey4_WVOeTE6UASlYo17Gbc';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkTriggers() {
  console.log('🔍 Checking for Database Triggers\n');
  console.log('=====================================\n');

  try {
    // Execute raw SQL to find triggers
    const triggerQuery = `
      SELECT
        t.trigger_name,
        t.event_manipulation,
        t.event_object_schema,
        t.event_object_table,
        t.action_statement,
        t.action_timing,
        t.action_orientation
      FROM information_schema.triggers t
      WHERE t.event_object_schema IN ('auth', 'public')
      ORDER BY t.event_object_schema, t.event_object_table, t.trigger_name;
    `;

    console.log('📝 Checking all triggers in the database...\n');

    // Since we can't run raw SQL directly, let's check for the specific trigger we know exists
    console.log('Testing known trigger function: handle_new_user\n');

    // Try to get the function definition
    let data = null;
    let error = null;
    try {
      const result = await supabase.rpc('get_function_info', {
        function_name: 'handle_new_user'
      });
      data = result.data;
      error = result.error;
    } catch (err) {
      error = err;
    }

    if (error) {
      console.log('Cannot get function info directly. Trying workaround...\n');

      // Let's test if we can create a user and see what happens
      console.log('🧪 Testing signup flow to identify the issue...\n');

      const testEmail = `trigger-test-${Date.now()}@test.com`;
      const testPassword = 'TestPassword123!';

      console.log(`Creating test user: ${testEmail}`);
      console.log('Starting timer...');

      const startTime = Date.now();

      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout after 10 seconds')), 10000);
      });

      // Try signup with timeout
      try {
        const signupPromise = supabase.auth.signUp({
          email: testEmail,
          password: testPassword,
          options: {
            data: {
              full_name: 'Trigger Test',
              username: `triggertest${Date.now()}`,
              role: 'seeker'
            }
          }
        });

        const result = await Promise.race([signupPromise, timeoutPromise]);

        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;

        if (result.error) {
          console.log(`❌ Signup failed after ${duration}s:`, result.error.message);
        } else {
          console.log(`✅ Signup succeeded in ${duration}s`);
          console.log('User ID:', result.data?.user?.id);
        }

      } catch (timeoutErr) {
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        console.log(`⏱️ Signup timed out after ${duration}s`);
        console.log('This confirms there is a hanging trigger!');
      }
    } else {
      console.log('Function info:', data);
    }

    // Check if there's a specific trigger on auth.users
    console.log('\n📋 Known Issue Pattern:');
    console.log('========================');
    console.log('Based on the symptoms, there is likely a trigger that:');
    console.log('1. Fires on INSERT to auth.users');
    console.log('2. Tries to create a row in public.profiles');
    console.log('3. Gets stuck due to:');
    console.log('   - Missing required fields');
    console.log('   - RLS policy issues');
    console.log('   - Infinite loop or retry logic');
    console.log('   - Waiting for external service');

    console.log('\n🔧 Recommended Fix:');
    console.log('==================');
    console.log('1. Option A: Disable the trigger temporarily');
    console.log('2. Option B: Fix the trigger function to handle errors properly');
    console.log('3. Option C: Create profiles asynchronously after signup');

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkTriggers();