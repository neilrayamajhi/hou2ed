const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials
const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.log('❌ ERROR: Service key not provided');
  console.log('\nTo check auth.users table, you need the service key from Supabase dashboard:');
  console.log('1. Go to Supabase Dashboard > Settings > API');
  console.log('2. Copy the "service_role" key (NOT the anon key)');
  console.log('3. Run: SUPABASE_SERVICE_KEY="your-key-here" node check-auth-users.js');
  console.log('\n⚠️ IMPORTANT: The service key has full admin access. Never expose it in client code!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkAuthUsers() {
  console.log('🔍 Checking for duplicate users in auth.users');
  console.log('==============================================\n');

  const testEmail = 'neilrayamajhi2008@gmail.com';

  try {
    // Get all users with this email from auth.users (requires service key)
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error('Error listing users:', error);
      return;
    }

    // Filter for the specific email
    const matchingUsers = users.filter(u =>
      u.email?.toLowerCase() === testEmail.toLowerCase()
    );

    if (matchingUsers.length === 0) {
      console.log(`No users found with email: ${testEmail}`);
    } else if (matchingUsers.length === 1) {
      console.log(`✅ Found 1 user with email: ${testEmail}`);
      const user = matchingUsers[0];
      console.log('   - User ID:', user.id);
      console.log('   - Email confirmed:', user.email_confirmed_at ? 'Yes' : 'No');
      console.log('   - Created at:', user.created_at);
      console.log('   - Last sign in:', user.last_sign_in_at || 'Never');
      console.log('   - Metadata:', JSON.stringify(user.user_metadata, null, 2));
    } else {
      console.log(`⚠️ WARNING: Found ${matchingUsers.length} DUPLICATE users with email: ${testEmail}`);
      matchingUsers.forEach((user, index) => {
        console.log(`\nUser ${index + 1}:`);
        console.log('   - User ID:', user.id);
        console.log('   - Email confirmed:', user.email_confirmed_at ? 'Yes' : 'No');
        console.log('   - Created at:', user.created_at);
        console.log('   - Last sign in:', user.last_sign_in_at || 'Never');
        console.log('   - Metadata:', JSON.stringify(user.user_metadata, null, 2));
      });

      console.log('\n⚠️ This is a problem! You have duplicate users in auth.users.');
      console.log('Solutions:');
      console.log('1. Delete the duplicate entries from Supabase Dashboard > Authentication > Users');
      console.log('2. Keep only the one that has been verified/used');
    }

    // Check profiles table
    console.log('\n📝 Checking profiles table...');
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', testEmail.toLowerCase());

    if (profileError) {
      console.error('Error checking profiles:', profileError);
    } else if (profiles && profiles.length > 0) {
      console.log(`Found ${profiles.length} profile(s) with this email:`);
      profiles.forEach((profile, index) => {
        console.log(`\nProfile ${index + 1}:`);
        console.log('   - ID:', profile.id);
        console.log('   - Username:', profile.username);
        console.log('   - Role:', profile.role);
      });
    } else {
      console.log('No profiles found with this email');
      console.log('This means the user exists in auth but not in profiles!');
    }

  } catch (err) {
    console.error('Error:', err);
  }

  process.exit(0);
}

checkAuthUsers();