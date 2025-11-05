const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials
const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testDuplicateDetailed() {
  console.log('🔬 Detailed Analysis of Duplicate Email Behavior');
  console.log('================================================\n');

  const existingEmail = 'neilrayamajhi2008@gmail.com';
  const timestamp = Date.now();

  console.log('Testing email:', existingEmail);

  try {
    const { data, error } = await supabase.auth.signUp({
      email: existingEmail,
      password: 'TestPassword123!',
      options: {
        data: {
          full_name: 'Duplicate Test',
          username: `duplicate${timestamp}`,
          role: 'seeker'
        }
      }
    });

    console.log('\n📝 Full Response Analysis:');
    console.log('========================\n');

    if (error) {
      console.log('❌ Error occurred:');
      console.log('   Message:', error.message);
      console.log('   Code:', error.code);
      console.log('   Status:', error.status);
      console.log('   Full error:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ No error returned (this is the problem!)\n');

      if (data) {
        console.log('Data object exists:', 'Yes');

        if (data.user) {
          console.log('\n🔍 User object analysis:');
          console.log('   - ID:', data.user.id);
          console.log('   - Email:', data.user.email);
          console.log('   - Email confirmed:', data.user.email_confirmed_at ? 'Yes' : 'No');
          console.log('   - Confirmation sent at:', data.user.confirmation_sent_at || 'NOT SENT');
          console.log('   - Identities array:', JSON.stringify(data.user.identities, null, 2));
          console.log('   - Identities length:', data.user.identities?.length || 0);
          console.log('   - User metadata:', JSON.stringify(data.user.user_metadata, null, 2));
          console.log('   - App metadata:', JSON.stringify(data.user.app_metadata, null, 2));
          console.log('   - Created at:', data.user.created_at);
          console.log('   - Updated at:', data.user.updated_at);

          console.log('\n🔑 Key indicators of duplicate:');
          if (!data.user.identities || data.user.identities.length === 0) {
            console.log('   ⚠️ DUPLICATE INDICATOR: No identities (identities = [])');
          }
          if (!data.user.confirmation_sent_at) {
            console.log('   ⚠️ DUPLICATE INDICATOR: No confirmation_sent_at timestamp');
          }
          if (data.user.email_confirmed_at) {
            console.log('   ⚠️ UNUSUAL: Email already confirmed (existing verified user)');
          }
        } else {
          console.log('User object: null');
        }

        if (data.session) {
          console.log('\nSession created:', 'Yes (user can login immediately)');
        } else {
          console.log('\nSession created:', 'No (verification required)');
        }
      } else {
        console.log('Data object: null');
      }
    }

    console.log('\n\n📊 Conclusion:');
    console.log('================');
    console.log('When an email already exists in auth.users, Supabase:');
    console.log('1. Does NOT return an error');
    console.log('2. Returns a user object with identities = []');
    console.log('3. Does NOT send a verification email');
    console.log('4. Sets confirmation_sent_at to null/undefined');
    console.log('\nWe can detect duplicates by checking:');
    console.log('- data.user.identities.length === 0');
    console.log('- !data.user.confirmation_sent_at');

  } catch (err) {
    console.error('Unexpected error:', err);
  }

  process.exit(0);
}

testDuplicateDetailed();