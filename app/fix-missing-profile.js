const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixProfile() {
  console.log('=== Fixing Missing Profile ===\n');

  const email = 'neilrayamajhi2008@gmail.com';
  const password = process.argv[2]; // Get password from command line

  if (!password) {
    console.log('Usage: node fix-missing-profile.js <your-password>');
    console.log('Example: node fix-missing-profile.js myPassword123');
    return;
  }

  try {
    // Step 1: Try to sign in to get the user ID
    console.log('Attempting to sign in with:', email);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.log('❌ Sign in failed:', authError.message);

      if (authError.message.includes('Invalid login credentials')) {
        console.log('\nPlease check your password or reset it first.');
        console.log('A password reset email was already sent to your email.');
      }
      return;
    }

    if (!authData?.user) {
      console.log('❌ No user data returned');
      return;
    }

    console.log('✅ Signed in successfully');
    console.log('User ID:', authData.user.id);
    console.log('Email:', authData.user.email);

    // Step 2: Check if profile exists
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (profileCheckError) {
      console.log('Error checking profile:', profileCheckError.message);
      return;
    }

    if (existingProfile) {
      console.log('\n✅ Profile already exists:');
      console.log('- Username:', existingProfile.username);
      console.log('- Full name:', existingProfile.full_name);
      console.log('- Role:', existingProfile.role);
      console.log('\nYou should be able to log in normally now!');
    } else {
      console.log('\n❌ No profile found. Creating one...');

      // Step 3: Create missing profile
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: authData.user.email,
          username: 'neilray2008', // You can change this
          full_name: 'Neil Rayamajhi',
          role: 'seeker', // or 'provider'
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.log('❌ Error creating profile:', createError.message);

        if (createError.message.includes('duplicate')) {
          console.log('Username already taken. Try a different username.');
        }
      } else {
        console.log('\n✅ Profile created successfully!');
        console.log('- Username:', newProfile.username);
        console.log('- Full name:', newProfile.full_name);
        console.log('- Role:', newProfile.role);
        console.log('\nYou can now log in with your email and password!');
      }
    }

    // Sign out after fixing
    await supabase.auth.signOut();

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

fixProfile();