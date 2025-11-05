const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials
const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4OTg4NiwiZXhwIjoyMDczOTY1ODg2fQ.J9Oc77ZR1E435SqDsngt8ey4_WVOeTE6UASlYo17Gbc';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkUserStatus() {
  const email = 'neilrayamajhi2008@gmail.com';

  console.log('🔍 Checking user status for:', email);
  console.log('=====================================\n');

  try {
    // Check auth.users
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }

    const user = users.find(u => u.email === email);

    if (user) {
      console.log('✅ User found in auth.users:');
      console.log('  ID:', user.id);
      console.log('  Email:', user.email);
      console.log('  Email Confirmed:', user.email_confirmed_at ? `Yes (${new Date(user.email_confirmed_at).toLocaleString()})` : 'No - NEEDS VERIFICATION');
      console.log('  Created:', new Date(user.created_at).toLocaleString());
      console.log('  Last Sign In:', user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never');
      console.log('  Metadata:', JSON.stringify(user.user_metadata, null, 2));

      // Check profile
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        console.log('\n✅ Profile found:');
        console.log('  Username:', profile.username);
        console.log('  Full Name:', profile.full_name);
        console.log('  Role:', profile.role);
      } else {
        console.log('\n⚠️ No profile found for this user');
      }

      // Try to manually confirm the email
      if (!user.email_confirmed_at) {
        console.log('\n🔧 Attempting to manually confirm email...');
        const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          user.id,
          { email_confirm: true }
        );

        if (updateError) {
          console.error('❌ Failed to confirm email:', updateError);
        } else {
          console.log('✅ Email confirmed successfully!');
          console.log('You should now be able to login.');
        }
      }
    } else {
      console.log('❌ User not found in auth.users');
    }

  } catch (err) {
    console.error('Error:', err);
  }
}

checkUserStatus();