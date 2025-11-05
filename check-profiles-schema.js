const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials
const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ ERROR: Service key not provided');
  console.log('\nUsage: SUPABASE_SERVICE_KEY="your-key" node check-profiles-schema.js');
  process.exit(1);
}

// Create admin client with service key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkSchema() {
  console.log('🔍 Checking profiles table schema');
  console.log('==================================\n');

  try {
    // Just select a sample row to see structure
    console.log('📝 Getting sample profile to understand structure...');
    const { data: sampleData, error: sampleError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.error('Error getting sample:', sampleError);
    } else if (sampleData && sampleData.length > 0) {
      console.log('Sample profile columns:', Object.keys(sampleData[0]));
      console.log('\nSample data:', sampleData[0]);
    } else {
      console.log('No profiles found in the table');

      // Let's check all profiles
      console.log('\n📝 Checking all profiles...');
      const { data: allProfiles, error: allError } = await supabase
        .from('profiles')
        .select('*');

      if (allError) {
        console.error('Error getting all profiles:', allError);
      } else {
        console.log('Total profiles in table:', allProfiles?.length || 0);
        if (allProfiles && allProfiles.length > 0) {
          console.log('\nFirst profile structure:', Object.keys(allProfiles[0]));
        }
      }
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkSchema();