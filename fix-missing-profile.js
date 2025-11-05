const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials
const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ ERROR: Service key not provided');
  console.log('\nUsage: SUPABASE_SERVICE_KEY="your-key" node fix-missing-profile.js');
  process.exit(1);
}

// Create admin client with service key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixMissingProfile() {
  console.log('🔧 Fixing Missing Profile for neilrayamajhi2008@gmail.com');
  console.log('=========================================================\n');

  const email = 'neilrayamajhi2008@gmail.com';
  const userId = 'c1ddb51c-6b9f-4c24-aa59-f12590b492d6';

  try {
    // Step 1: Check if profile already exists
    console.log('📝 Step 1: Checking if profile exists...');
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking profile:', checkError);
      return;
    }

    if (existingProfile) {
      console.log('✅ Profile already exists!');
      console.log('Profile data:', existingProfile);
      return;
    }

    console.log('⚠️ Profile does not exist. Creating it now...\n');

    // Step 2: Create the profile
    console.log('📝 Step 2: Creating profile...');
    const profileData = {
      id: userId,
      email: email.toLowerCase(),
      full_name: 'Neil Rayamajhi',
      username: 'neil',
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
    };

    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert(profileData)
      .select()
      .single();

    if (createError) {
      console.error('❌ Failed to create profile:', createError);

      // If the username is taken, try with a different username
      if (createError.message?.includes('duplicate') && createError.message?.includes('username')) {
        console.log('\n🔄 Username "neil" is taken. Trying with a unique username...');

        const timestamp = Date.now();
        profileData.username = `neil${timestamp}`;

        const { data: retryProfile, error: retryError } = await supabase
          .from('profiles')
          .insert(profileData)
          .select()
          .single();

        if (retryError) {
          console.error('❌ Failed to create profile with unique username:', retryError);
          return;
        }

        console.log('✅ Profile created successfully with username:', profileData.username);
        console.log('Profile data:', retryProfile);
        console.log('\n⚠️ Note: You may want to update the username later to something more memorable.');
      }
      return;
    }

    console.log('✅ Profile created successfully!');
    console.log('Profile data:', newProfile);

    // Step 3: Verify the profile was created
    console.log('\n📝 Step 3: Verifying profile creation...');
    const { data: verifyProfile, error: verifyError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (verifyError) {
      console.error('❌ Error verifying profile:', verifyError);
      return;
    }

    if (verifyProfile) {
      console.log('✅ Profile verified successfully!');
      console.log('\n✨ Account is now fixed! The user has both auth.users and profiles records.');
      console.log('\nProfile details:');
      console.log('  - User ID:', verifyProfile.id);
      console.log('  - Email:', verifyProfile.email);
      console.log('  - Username:', verifyProfile.username);
      console.log('  - Full Name:', verifyProfile.full_name);
      console.log('  - Role:', verifyProfile.role);
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

fixMissingProfile();