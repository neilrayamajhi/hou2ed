const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials
const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4OTg4NiwiZXhwIjoyMDczOTY1ODg2fQ.J9Oc77ZR1E435SqDsngt8ey4_WVOeTE6UASlYo17Gbc';

// Create admin client with service key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createUserManually() {
  console.log('🔧 Manual User Creation Workaround');
  console.log('===================================\n');
  console.log('This bypasses the broken trigger by creating the user and profile separately.\n');

  // Get user input
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

  try {
    const email = await question('Email: ');
    const password = await question('Password: ');
    const fullName = await question('Full Name: ');
    const username = await question('Username: ');
    const role = await question('Role (seeker/provider): ');

    console.log('\n📝 Step 1: Creating user in auth.users...');

    // Create the user using admin API (bypasses triggers)
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
        username,
        role
      }
    });

    if (userError) {
      console.error('❌ Failed to create user:', userError.message);
      rl.close();
      return;
    }

    console.log('✅ User created:', userData.user.id);

    // Step 2: Create the profile manually
    console.log('\n📝 Step 2: Creating profile...');

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userData.user.id,
        email: email.toLowerCase(),
        full_name: fullName,
        username,
        role,
        phone: null,
        avatar_url: null,
        verified_provider: false,
        verification_status: null,
        verification_documents: null,
        seeker_profile: {},
        provider_profile: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (profileError) {
      console.error('❌ Failed to create profile:', profileError.message);

      // If profile creation fails, we should delete the auth user to avoid orphaned records
      console.log('🧹 Cleaning up auth user...');
      await supabase.auth.admin.deleteUser(userData.user.id);
      console.log('✅ Auth user deleted');
    } else {
      console.log('✅ Profile created successfully!');
      console.log('\n✨ User account created successfully!');
      console.log('   Email:', email);
      console.log('   Username:', username);
      console.log('   User ID:', userData.user.id);
      console.log('\n🔐 The user can now login with their credentials.');
    }

    rl.close();
  } catch (err) {
    console.error('Unexpected error:', err);
    rl.close();
  }
}

createUserManually();