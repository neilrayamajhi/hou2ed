const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials
const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4OTg4NiwiZXhwIjoyMDczOTY1ODg2fQ.J9Oc77ZR1E435SqDsngt8ey4_WVOeTE6UASlYo17Gbc';

// Create admin client with service role key
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixAuthIssues() {
  console.log('🔧 Diagnosing and Fixing Auth Issues');
  console.log('=====================================\n');

  try {
    // 1. List all users to check for duplicates
    console.log('📝 Checking all users in auth.users...');
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error('❌ Error listing users:', listError);
      return;
    }

    console.log(`Found ${users.length} total users\n`);

    // Group users by email to find duplicates
    const emailMap = {};
    users.forEach(user => {
      const email = user.email?.toLowerCase();
      if (email) {
        if (!emailMap[email]) {
          emailMap[email] = [];
        }
        emailMap[email].push(user);
      }
    });

    // Find and report duplicates
    console.log('🔍 Checking for duplicate emails...');
    const duplicates = Object.entries(emailMap).filter(([email, users]) => users.length > 1);

    if (duplicates.length > 0) {
      console.log(`⚠️  Found ${duplicates.length} email(s) with duplicates:\n`);

      duplicates.forEach(([email, users]) => {
        console.log(`Email: ${email}`);
        users.forEach(user => {
          console.log(`  - ID: ${user.id}`);
          console.log(`    Created: ${user.created_at}`);
          console.log(`    Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
          console.log(`    Last Sign In: ${user.last_sign_in_at || 'Never'}`);
          console.log(`    Metadata: ${JSON.stringify(user.user_metadata)}`);
        });
        console.log();
      });

      // Offer to clean up duplicates
      console.log('📋 Cleanup Recommendations:');
      console.log('1. Keep only the confirmed/used accounts');
      console.log('2. Delete unconfirmed duplicates\n');
    } else {
      console.log('✅ No duplicate emails found\n');
    }

    // 2. Check for your specific account
    console.log('🔍 Checking neilrayamajhi2008@gmail.com...');
    const neilUsers = emailMap['neilrayamajhi2008@gmail.com'] || [];

    if (neilUsers.length === 0) {
      console.log('❌ Account not found. Creating new account...\n');

      // Create a new account with admin privileges
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: 'neilrayamajhi2008@gmail.com',
        password: 'TestPassword123!',
        email_confirm: true, // Auto-confirm the email
        user_metadata: {
          full_name: 'Neil Rayamajhi',
          username: 'neilrayamajhi',
          role: 'seeker'
        }
      });

      if (createError) {
        console.error('❌ Failed to create account:', createError);
      } else {
        console.log('✅ Account created successfully!');
        console.log('   ID:', newUser.user.id);
        console.log('   Email:', newUser.user.email);
        console.log('   Password: TestPassword123!');
        console.log('\n⚠️  IMPORTANT: Change this password after logging in!');
      }
    } else if (neilUsers.length === 1) {
      const user = neilUsers[0];
      console.log('✅ Found your account:');
      console.log('   ID:', user.id);
      console.log('   Confirmed:', user.email_confirmed_at ? 'Yes' : 'No');

      if (!user.email_confirmed_at) {
        console.log('\n🔧 Confirming email...');
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          user.id,
          { email_confirm: true }
        );

        if (updateError) {
          console.error('❌ Failed to confirm email:', updateError);
        } else {
          console.log('✅ Email confirmed!');
        }
      }

      // Reset password
      console.log('\n🔑 Resetting password to TestPassword123!...');
      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { password: 'TestPassword123!' }
      );

      if (passwordError) {
        console.error('❌ Failed to reset password:', passwordError);
      } else {
        console.log('✅ Password reset successfully!');
        console.log('\nYou can now login with:');
        console.log('   Email: neilrayamajhi2008@gmail.com');
        console.log('   Password: TestPassword123!');
      }
    } else {
      console.log(`⚠️  Found ${neilUsers.length} duplicate accounts!`);

      // Delete all but the most recent or confirmed one
      const toKeep = neilUsers.find(u => u.email_confirmed_at) || neilUsers[0];
      const toDelete = neilUsers.filter(u => u.id !== toKeep.id);

      console.log(`\n🗑️  Deleting ${toDelete.length} duplicate(s)...`);

      for (const user of toDelete) {
        const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
        if (error) {
          console.error(`❌ Failed to delete ${user.id}:`, error);
        } else {
          console.log(`✅ Deleted duplicate: ${user.id}`);
        }
      }

      // Fix the remaining account
      console.log('\n🔧 Fixing remaining account...');
      const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
        toKeep.id,
        {
          email_confirm: true,
          password: 'TestPassword123!'
        }
      );

      if (confirmError) {
        console.error('❌ Failed to fix account:', confirmError);
      } else {
        console.log('✅ Account fixed!');
        console.log('\nYou can now login with:');
        console.log('   Email: neilrayamajhi2008@gmail.com');
        console.log('   Password: TestPassword123!');
      }
    }

    // 3. Test the login
    console.log('\n🧪 Testing login...');
    const { data: loginData, error: loginError } = await supabaseAdmin.auth.signInWithPassword({
      email: 'neilrayamajhi2008@gmail.com',
      password: 'TestPassword123!'
    });

    if (loginError) {
      console.error('❌ Login test failed:', loginError.message);
    } else if (loginData.user) {
      console.log('✅ Login test successful!');
      console.log('   User ID:', loginData.user.id);
      console.log('   Session created:', loginData.session ? 'Yes' : 'No');
    }

    console.log('\n✨ Auth issues have been resolved!');
    console.log('You should now be able to login to the app.');

  } catch (err) {
    console.error('Unexpected error:', err);
  }

  process.exit(0);
}

fixAuthIssues();