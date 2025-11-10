const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4OTg4NiwiZXhwIjoyMDczOTY1ODg2fQ.J9Oc77ZR1E435SqDsngt8ey4_WVOeTE6UASlYo17Gbc';

async function executeRLSFix() {
  console.log('🔧 Executing RLS fix to allow seekers to view listings...\n');

  // Using fetch to directly call Supabase's admin API
  const queries = [
    // Drop existing policies
    `DROP POLICY IF EXISTS "Enable read access for all users" ON public.listings`,
    `DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.listings`,
    `DROP POLICY IF EXISTS "Enable update for users based on provider_id" ON public.listings`,
    `DROP POLICY IF EXISTS "Enable delete for users based on provider_id" ON public.listings`,
    `DROP POLICY IF EXISTS "Listings are viewable by everyone" ON public.listings`,
    `DROP POLICY IF EXISTS "Providers can view all their listings" ON public.listings`,
    `DROP POLICY IF EXISTS "Anyone can view active listings" ON public.listings`,
    `DROP POLICY IF EXISTS "Users can view active listings" ON public.listings`,
    `DROP POLICY IF EXISTS "Public can view active listings" ON public.listings`,
    `DROP POLICY IF EXISTS "Providers view own listings" ON public.listings`,
    `DROP POLICY IF EXISTS "Providers create own listings" ON public.listings`,
    `DROP POLICY IF EXISTS "Providers update own listings" ON public.listings`,
    `DROP POLICY IF EXISTS "Providers create listings" ON public.listings`,
    `DROP POLICY IF EXISTS "Providers update their listings" ON public.listings`,
    `DROP POLICY IF EXISTS "Providers can create listings" ON public.listings`,
    `DROP POLICY IF EXISTS "Providers can update their listings" ON public.listings`,
    `DROP POLICY IF EXISTS "Providers can delete their listings" ON public.listings`,
    `DROP POLICY IF EXISTS "anon_view_active_listings" ON public.listings`,
    `DROP POLICY IF EXISTS "providers_view_own" ON public.listings`,
    `DROP POLICY IF EXISTS "providers_create" ON public.listings`,
    `DROP POLICY IF EXISTS "providers_update" ON public.listings`,
    `DROP POLICY IF EXISTS "providers_delete" ON public.listings`,

    // Create new policies
    `CREATE POLICY "anon_view_active_listings" ON public.listings FOR SELECT USING (is_active = true)`,
    `CREATE POLICY "providers_view_own" ON public.listings FOR SELECT USING (auth.uid() = provider_id)`,
    `CREATE POLICY "providers_create" ON public.listings FOR INSERT WITH CHECK (auth.uid() = provider_id)`,
    `CREATE POLICY "providers_update" ON public.listings FOR UPDATE USING (auth.uid() = provider_id) WITH CHECK (auth.uid() = provider_id)`,
    `CREATE POLICY "providers_delete" ON public.listings FOR DELETE USING (auth.uid() = provider_id)`
  ];

  let successCount = 0;
  let failCount = 0;

  for (const query of queries) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ query })
      });

      if (response.ok || response.status === 204 || response.status === 200) {
        console.log(`✅ ${query.substring(0, 50)}...`);
        successCount++;
      } else {
        const errorText = await response.text();
        if (errorText.includes('already exists') || errorText.includes('does not exist')) {
          console.log(`⚠️  ${query.substring(0, 50)}... (expected error)`);
          successCount++;
        } else {
          console.log(`❌ ${query.substring(0, 50)}...`);
          console.log(`   Error: ${errorText}`);
          failCount++;
        }
      }
    } catch (error) {
      console.log(`❌ ${query.substring(0, 50)}...`);
      console.log(`   Error:`, error.message);
      failCount++;
    }
  }

  console.log(`\n📊 Results: ${successCount} successful, ${failCount} failed\n`);

  // Test if the fix worked
  console.log('Testing if anonymous users can now see listings...\n');

  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';
  const supabase = createClient(supabaseUrl, anonKey);

  const { data, error } = await supabase
    .from('listings')
    .select('id, title, is_active')
    .eq('is_active', true)
    .limit(5);

  if (error) {
    console.log('❌ Anonymous users still CANNOT see listings');
    console.log('   Error:', error.message);
    console.log('\n📝 Manual Fix Required:');
    console.log('   Please run the SQL commands in Supabase Dashboard:');
    console.log('   https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/editor');
  } else {
    console.log('✅ Anonymous users CAN now see listings!');
    console.log(`   Found ${data?.length || 0} active listings`);
    if (data && data.length > 0) {
      data.forEach(l => console.log(`     - ${l.title}`));
    }
  }

  // Also check with service role to compare
  const adminSupabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: allData } = await adminSupabase
    .from('listings')
    .select('id, title')
    .eq('is_active', true);

  console.log(`\n📊 Service role sees ${allData?.length || 0} active listings`);

  if (allData?.length > 0 && (!data || data.length === 0)) {
    console.log('\n⚠️  RLS is still blocking anonymous users!');
    console.log('   The SQL commands need to be run directly in Supabase.');
  }
}

executeRLSFix().catch(console.error);