/**
 * Fix Orphaned Account for rayamajhineil@gmail.com
 * 
 * This deletes the account from auth.users so you can sign up fresh.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
// Get this from: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/settings/api
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'YOUR_SERVICE_ROLE_KEY_HERE';

const EMAIL = 'rayamajhineil@gmail.com';

async function fixAccount() {
  console.log('🔧 Fixing orphaned account for:', EMAIL);
  console.log('');

  if (SUPABASE_SERVICE_KEY === 'YOUR_SERVICE_ROLE_KEY_HERE') {
    console.error('❌ ERROR: You need to set the SUPABASE_SERVICE_KEY');
    console.log('');
    console.log('Get it from:');
    console.log('https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/settings/api');
    console.log('');
    console.log('Look for: service_role (secret) key');
    console.log('');
    console.log('Then run:');
    console.log('SUPABASE_SERVICE_KEY=your-key-here node fix-neil-orphaned-account.js');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // Step 1: Check profiles table
    console.log('Step 1: Checking if profile exists...');
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, username, role')
      .eq('email', EMAIL.toLowerCase())
      .maybeSingle();

    if (profile) {
      console.log('✅ Profile EXISTS in database!');
      console.log('   ID:', profile.id);
      console.log('   Username:', profile.username);
      console.log('   Role:', profile.role);
      console.log('');
      console.log('The account is properly set up. Try:');
      console.log('1. Check your email for verification code');
      console.log('2. Use password reset if you forgot password');
      console.log('3. Try logging in with username:', profile.username);
      return;
    }

    console.log('⚠️  Profile NOT found in database');
    console.log('');

    // Step 2: Find user in auth.users
    console.log('Step 2: Searching for user in auth system...');
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('❌ Error listing users:', listError.message);
      console.log('');
      console.log('Make sure the SERVICE_ROLE_KEY is correct (not anon key)');
      return;
    }

    const authUser = authUsers.users.find(
      u => u.email?.toLowerCase() === EMAIL.toLowerCase()
    );

    if (!authUser) {
      console.log('✅ User NOT found in auth system either');
      console.log('');
      console.log('🎉 Great news! The email is completely available!');
      console.log('   You can sign up with', EMAIL, 'right now.');
      return;
    }

    // Found the orphaned account!
    console.log('🎯 FOUND ORPHANED ACCOUNT:');
    console.log('   User ID:', authUser.id);
    console.log('   Email:', authUser.email);
    console.log('   Created:', authUser.created_at);
    console.log('   Confirmed:', authUser.email_confirmed_at ? 'Yes' : 'No');
    console.log('');
    console.log('This account exists in auth but has no profile.');
    console.log('Deleting it so you can sign up fresh...');
    console.log('');

    // Step 3: Delete the orphaned account
    console.log('Step 3: Deleting orphaned account...');
    const { error: deleteError } = await supabase.auth.admin.deleteUser(authUser.id);

    if (deleteError) {
      console.error('❌ Failed to delete:', deleteError.message);
      console.log('');
      console.log('Manual fix:');
      console.log('1. Go to Supabase Dashboard');
      console.log('2. Authentication → Users');
      console.log('3. Find', EMAIL);
      console.log('4. Delete the user');
      return;
    }

    console.log('✅ SUCCESS! Orphaned account deleted!');
    console.log('');
    console.log('🎉 You can now sign up with', EMAIL);
    console.log('   Go ahead and create your account in the app!');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('');
    console.log('Debug info:');
    console.log('- URL:', SUPABASE_URL);
    console.log('- Service key starts with:', SUPABASE_SERVICE_KEY.substring(0, 20) + '...');
    console.log('- Email:', EMAIL);
  }
}

console.log('═══════════════════════════════════════════');
console.log('   Fix Orphaned Account');
console.log('═══════════════════════════════════════════');
console.log('');

fixAccount().then(() => {
  console.log('Done!');
}).catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});

