const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials
const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4OTg4NiwiZXhwIjoyMDczOTY1ODg2fQ.J9Oc77ZR1E435SqDsngt8ey4_WVOeTE6UASlYo17Gbc';

// Create admin client
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTestAccount() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('🔧 Create Test Account (Bypass Email Verification)');
  console.log('==================================================\n');

  rl.question('Enter email for test account: ', async (email) => {
    rl.question('Enter password (min 8 chars): ', async (password) => {
      rl.question('Enter username: ', async (username) => {
        rl.question('Role (seeker/provider): ', async (role) => {

          console.log('\nCreating account...');

          try {
            // Create account with admin privileges (auto-confirms email)
            const { data, error } = await supabaseAdmin.auth.admin.createUser({
              email: email.trim(),
              password: password.trim(),
              email_confirm: true, // Auto-confirm email
              user_metadata: {
                full_name: 'Test User',
                username: username.trim(),
                role: role.trim() || 'seeker'
              }
            });

            if (error) {
              console.error('❌ Failed to create account:', error.message);
            } else if (data?.user) {
              console.log('\n✅ Account created successfully!');
              console.log('   ID:', data.user.id);
              console.log('   Email:', data.user.email);
              console.log('   Email Verified: Yes (auto-confirmed)');
              console.log('\n📱 You can now login in the app with:');
              console.log('   Email:', email);
              console.log('   Password:', password);

              // Also create profile entry
              const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .insert({
                  id: data.user.id,
                  email: data.user.email,
                  username: username.trim(),
                  full_name: 'Test User',
                  role: role.trim() || 'seeker',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });

              if (profileError) {
                console.log('\n⚠️  Note: Profile creation failed:', profileError.message);
                console.log('   The account will still work but might be missing profile data.');
              } else {
                console.log('\n✅ Profile created in database');
              }
            }
          } catch (err) {
            console.error('Error:', err);
          }

          rl.close();
        });
      });
    });
  });
}

createTestAccount();