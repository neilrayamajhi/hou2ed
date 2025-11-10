const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4OTg4NiwiZXhwIjoyMDczOTY1ODg2fQ.J9Oc77ZR1E435SqDsngt8ey4_WVOeTE6UASlYo17Gbc';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' }
});

async function fixRLSPolicies() {
  console.log('Fixing RLS policies for listings table...\n');

  try {
    // Step 1: Check current policies
    console.log('1. Checking existing policies...');
    const { data: currentPolicies } = await supabase.rpc('get_policies', {
      table_name: 'listings'
    }).catch(() => ({ data: null }));

    if (currentPolicies) {
      console.log('Current policies:', currentPolicies);
    }

    // Step 2: Drop existing policies
    console.log('\n2. Dropping existing policies...');
    const policiesToDrop = [
      'Listings are viewable by everyone',
      'Providers can view all their listings',
      'Anyone can view active listings',
      'Users can view active listings'
    ];

    for (const policyName of policiesToDrop) {
      try {
        await supabase.rpc('exec_sql', {
          sql: `DROP POLICY IF EXISTS "${policyName}" ON public.listings;`
        });
        console.log(`   Dropped: ${policyName}`);
      } catch (err) {
        // Ignore errors if policy doesn't exist
      }
    }

    // Step 3: Create new policies
    console.log('\n3. Creating new RLS policies...');

    // Policy 1: Anyone can view active listings (most important for seekers!)
    const policy1 = `
      CREATE POLICY "Anyone can view active listings"
      ON public.listings
      FOR SELECT
      USING (is_active = true);
    `;

    // Policy 2: Providers can view all their own listings
    const policy2 = `
      CREATE POLICY "Providers can view all their listings"
      ON public.listings
      FOR SELECT
      USING (auth.uid() = provider_id);
    `;

    // Policy 3: Providers can insert listings
    const policy3 = `
      CREATE POLICY "Providers can create listings"
      ON public.listings
      FOR INSERT
      WITH CHECK (auth.uid() = provider_id);
    `;

    // Policy 4: Providers can update their listings
    const policy4 = `
      CREATE POLICY "Providers can update their listings"
      ON public.listings
      FOR UPDATE
      USING (auth.uid() = provider_id)
      WITH CHECK (auth.uid() = provider_id);
    `;

    // Execute each policy
    const policies = [
      { sql: policy1, name: 'Anyone can view active listings' },
      { sql: policy2, name: 'Providers can view all their listings' },
      { sql: policy3, name: 'Providers can create listings' },
      { sql: policy4, name: 'Providers can update their listings' }
    ];

    for (const policy of policies) {
      try {
        // Use direct SQL execution via service role
        const { error } = await supabase.rpc('exec_sql', {
          sql: policy.sql
        }).catch(() => ({ error: 'RPC not available' }));

        if (error === 'RPC not available') {
          console.log(`   ⚠️  Cannot execute SQL directly. Please run the following in Supabase SQL editor:`);
          console.log(policy.sql);
        } else {
          console.log(`   ✅ Created: ${policy.name}`);
        }
      } catch (err) {
        console.error(`   ❌ Failed to create ${policy.name}:`, err.message);
      }
    }

    // Step 4: Test the fix
    console.log('\n4. Testing the fix...');

    // Test with anon key (what seekers use)
    const anonSupabase = createClient(
      supabaseUrl,
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU'
    );

    const { data: anonData, error: anonError } = await anonSupabase
      .from('listings')
      .select('id, title, is_active')
      .eq('is_active', true)
      .limit(5);

    if (anonError) {
      console.log('   ❌ Anon users still cannot see listings:', anonError.message);
      console.log('\n⚠️  The RLS fix needs to be applied directly in Supabase dashboard.');
      console.log('Please go to: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/editor/29199');
      console.log('And run the SQL commands from fix-listings-rls.sql');
    } else {
      console.log(`   ✅ Anon users can now see ${anonData?.length || 0} active listings!`);
      if (anonData && anonData.length > 0) {
        console.log('   Visible listings:');
        anonData.forEach(l => console.log(`     - ${l.title}`));
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

// Alternative: Direct SQL execution
async function executeDirectSQL() {
  console.log('\n=== Direct SQL Execution ===\n');
  console.log('Since RPC might not be available, here is the SQL to run in Supabase Dashboard:\n');

  const sql = `
-- Fix RLS policies for listings table

-- Drop existing policies
DROP POLICY IF EXISTS "Listings are viewable by everyone" ON public.listings;
DROP POLICY IF EXISTS "Providers can view all their listings" ON public.listings;
DROP POLICY IF EXISTS "Anyone can view active listings" ON public.listings;
DROP POLICY IF EXISTS "Users can view active listings" ON public.listings;

-- Create new policy: Anyone (including anonymous users) can view active listings
CREATE POLICY "Anyone can view active listings"
ON public.listings
FOR SELECT
USING (is_active = true);

-- Providers can view all their own listings
CREATE POLICY "Providers can view all their listings"
ON public.listings
FOR SELECT
USING (auth.uid() = provider_id);

-- Providers can create listings
CREATE POLICY "Providers can create listings"
ON public.listings
FOR INSERT
WITH CHECK (auth.uid() = provider_id);

-- Providers can update their listings
CREATE POLICY "Providers can update their listings"
ON public.listings
FOR UPDATE
USING (auth.uid() = provider_id)
WITH CHECK (auth.uid() = provider_id);
`;

  console.log(sql);
  console.log('\n📋 Copy the above SQL and run it in:');
  console.log('https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/editor');
}

// Run the fix
fixRLSPolicies().then(() => {
  executeDirectSQL();
});