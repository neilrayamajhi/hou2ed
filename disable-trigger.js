const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials
const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4OTg4NiwiZXhwIjoyMDczOTY1ODg2fQ.J9Oc77ZR1E435SqDsngt8ey4_WVOeTE6UASlYo17Gbc';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function disableTrigger() {
  console.log('🔧 Attempting to fix the broken trigger');
  console.log('=====================================\n');

  try {
    // First, let's check if there's a profiles entry for all auth users
    console.log('📝 Checking for orphaned auth users without profiles...');

    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (!usersError && users) {
      console.log(`Found ${users.length} total users in auth.users\n`);

      // Check each user has a profile
      for (const user of users) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single();

        if (profileError && profileError.message.includes('No rows')) {
          console.log(`⚠️ User ${user.email} (${user.id}) has no profile`);

          // Create missing profile
          console.log(`  Creating profile for ${user.email}...`);
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email || '',
              username: user.user_metadata?.username || user.email?.split('@')[0] || 'user',
              full_name: user.user_metadata?.full_name || '',
              role: user.user_metadata?.role || 'seeker',
              created_at: user.created_at,
              updated_at: new Date().toISOString()
            });

          if (insertError) {
            console.error(`  ❌ Failed to create profile:`, insertError.message);
          } else {
            console.log(`  ✅ Profile created`);
          }
        }
      }
    }

    console.log('\n🧪 Testing if signup works now...');
    const timestamp = Date.now();
    const testEmail = `fixtest${timestamp}@gmail.com`;

    console.log(`Attempting signup with: ${testEmail}`);
    const startTime = Date.now();

    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!',
      options: {
        data: {
          full_name: 'Fix Test',
          username: `fixtest${timestamp}`,
          role: 'seeker'
        }
      }
    });

    const duration = (Date.now() - startTime) / 1000;
    console.log(`Signup completed in ${duration} seconds\n`);

    if (signupError) {
      if (signupError.status === 504) {
        console.log('❌ Still getting 504 timeout');
        console.log('\n⚠️ The trigger is still broken.');
        console.log('\nYou need to manually disable it in Supabase dashboard:');
        console.log('1. Go to: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/editor');
        console.log('2. Run this SQL:');
        console.log('\n-- Find the trigger');
        console.log("SELECT trigger_name FROM information_schema.triggers WHERE event_object_schema = 'auth';");
        console.log('\n-- Disable it (replace TRIGGER_NAME with actual name)');
        console.log("ALTER TABLE auth.users DISABLE TRIGGER TRIGGER_NAME;");
      } else if (signupError.message?.includes('rate')) {
        console.log('⚠️ Rate limited (but not timing out - progress!)');
      } else {
        console.log('Error:', signupError.message);
      }
    } else if (signupData?.user) {
      console.log('✅ SIGNUP WORKS! The issue has been resolved!');
      console.log('User created:', signupData.user.id);

      // Clean up test user
      await supabase.auth.admin.deleteUser(signupData.user.id);
    }

  } catch (err) {
    console.error('Error:', err);
  }

  process.exit(0);
}

disableTrigger();