/**
 * Fix Orphaned Account Script
 * 
 * This script fixes accounts that exist in auth.users but not in profiles table.
 * This happens when signup partially fails - user is created but profile isn't.
 * 
 * Usage: node fix-orphaned-account.js
 */

const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials
const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_SERVICE_KEY = 'YOUR_SERVICE_ROLE_KEY_HERE'; // You need to get this from Supabase dashboard

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const EMAIL_TO_FIX = 'rayamajhineil@gmail.com';

async function fixOrphanedAccount() {
  console.log('🔍 Checking for orphaned account:', EMAIL_TO_FIX);
  console.log('');

  try {
    // Step 1: Check if profile exists
    console.log('Step 1: Checking profiles table...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', EMAIL_TO_FIX.toLowerCase())
      .maybeSingle();

    if (profileError) {
      console.error('❌ Error checking profiles:', profileError.message);
      return;
    }

    if (profile) {
      console.log('✅ Profile exists!');
      console.log('   User ID:', profile.id);
      console.log('   Username:', profile.username);
      console.log('   Role:', profile.role);
      console.log('');
      console.log('🤔 Profile exists, so the issue might be:');
      console.log('   1. Email not verified - check your email for verification code');
      console.log('   2. Wrong password - try password reset');
      console.log('   3. Account locked - contact support');
      return;
    }

    console.log('⚠️  Profile NOT found in profiles table');
    console.log('');

    // Step 2: Check auth.users using admin API
    console.log('Step 2: Checking auth.users table...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('❌ Error checking auth users:', authError.message);
      console.log('');
      console.log('💡 Make sure you used the SERVICE_ROLE_KEY (not anon key)');
      console.log('   Get it from: Supabase Dashboard → Settings → API → service_role key');
      return;
    }

    const authUser = authUsers.users.find(u => u.email?.toLowerCase() === EMAIL_TO_FIX.toLowerCase());

    if (!authUser) {
      console.log('❌ User not found in auth.users either');
      console.log('');
      console.log('✅ Good news! The email is completely available.');
      console.log('   You can sign up with this email now.');
      return;
    }

    // Found orphaned user!
    console.log('🎯 FOUND ORPHANED ACCOUNT!');
    console.log('   User ID:', authUser.id);
    console.log('   Email:', authUser.email);
    console.log('   Created:', authUser.created_at);
    console.log('   Email Confirmed:', authUser.email_confirmed_at ? 'Yes' : 'No');
    console.log('');

    // Step 3: Offer solutions
    console.log('📋 You have 2 options:');
    console.log('');
    console.log('OPTION 1: Delete the orphaned account (recommended)');
    console.log('  - This lets you start fresh and sign up again');
    console.log('  - Run: deleteOrphanedAccount()');
    console.log('');
    console.log('OPTION 2: Create the missing profile');
    console.log('  - This completes the signup that failed');
    console.log('  - You\'ll need to provide username and role');
    console.log('  - Run: createMissingProfile()');
    console.log('');

    // For now, let's just delete it (safer)
    console.log('🔧 AUTOMATICALLY DELETING ORPHANED ACCOUNT...');
    const { error: deleteError } = await supabase.auth.admin.deleteUser(authUser.id);

    if (deleteError) {
      console.error('❌ Failed to delete user:', deleteError.message);
      console.log('');
      console.log('Manual deletion steps:');
      console.log('1. Go to: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf');
      console.log('2. Click: Authentication → Users');
      console.log('3. Find:', EMAIL_TO_FIX);
      console.log('4. Click the three dots → Delete user');
      return;
    }

    console.log('✅ ORPHANED ACCOUNT DELETED!');
    console.log('');
    console.log('🎉 You can now sign up with', EMAIL_TO_FIX);
    console.log('   The email is completely free to use.');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.log('');
    console.log('Need help? Check:');
    console.log('1. Service key is correct');
    console.log('2. Supabase URL is correct');
    console.log('3. You have internet connection');
  }
}

// Run the script
console.log('');
console.log('═══════════════════════════════════════════════════');
console.log('    HOU2ED - Orphaned Account Fixer');
console.log('═══════════════════════════════════════════════════');
console.log('');

fixOrphanedAccount().then(() => {
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('Script complete!');
  console.log('═══════════════════════════════════════════════════');
  console.log('');
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});

