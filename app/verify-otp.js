const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyOTP() {
  const email = 'neilrayamajhi2008@gmail.com';
  const code = process.argv[2];

  if (!code || code.length !== 6) {
    console.log('Usage: node verify-otp.js <6-digit-code>');
    console.log('Example: node verify-otp.js 123456');
    return;
  }

  console.log('=== Verifying OTP Code ===\n');
  console.log('Email:', email);
  console.log('Code:', code);

  try {
    // Verify the OTP code
    const { data, error } = await supabase.auth.verifyOtp({
      email: email,
      token: code,
      type: 'email'
    });

    if (error) {
      console.log('❌ Verification failed:', error.message);

      if (error.message.includes('expired')) {
        console.log('\nThe code has expired. Run "node send-otp-code.js" to get a new one.');
      } else if (error.message.includes('invalid')) {
        console.log('\nInvalid code. Make sure you entered the correct 6-digit code.');
      }
      return;
    }

    if (data?.user) {
      console.log('✅ Verification successful!');
      console.log('User ID:', data.user.id);
      console.log('Email:', data.user.email);
      console.log('Email verified:', data.user.email_confirmed_at ? 'Yes' : 'No');

      // Check if profile exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profile) {
        console.log('\n✅ Profile exists:');
        console.log('- Username:', profile.username);
        console.log('- Role:', profile.role);
        console.log('\nYou can now log in with your email and set a password!');
      } else {
        console.log('\n⚠️  No profile found. Creating one...');

        // Create profile
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: data.user.email,
            username: 'neilray2008', // Change if needed
            full_name: 'Neil Rayamajhi',
            role: 'seeker',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) {
          console.log('❌ Error creating profile:', createError.message);
          if (createError.message.includes('duplicate')) {
            console.log('Username "neilray2008" is taken. You need to manually update it.');
          }
        } else {
          console.log('✅ Profile created!');
          console.log('- Username:', newProfile.username);
          console.log('- Role:', newProfile.role);
        }
      }

      // Update user password
      console.log('\n=== Setting New Password ===');
      const newPassword = process.argv[3];

      if (newPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (passwordError) {
          console.log('❌ Error setting password:', passwordError.message);
        } else {
          console.log('✅ Password set successfully!');
          console.log('You can now log in with:');
          console.log('- Email:', email);
          console.log('- Password:', newPassword);
        }
      } else {
        console.log('No password provided. To set a password, run:');
        console.log(`node verify-otp.js ${code} <new-password>`);
      }

      // Sign out
      await supabase.auth.signOut();
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

verifyOTP();