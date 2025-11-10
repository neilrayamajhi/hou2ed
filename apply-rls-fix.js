const { createClient } = require('@supabase/supabase-js');

async function applyRLSFix() {
  console.log('🔧 Applying RLS fix to allow seekers to view listings...\n');

  // First, let's just test if the current setup works
  const supabaseUrl = 'https://rixiofltzptwaiwxhhlf.supabase.co';
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

  const supabase = createClient(supabaseUrl, anonKey);

  // Test current state
  console.log('Testing current state with anon key (what seekers use)...');

  const { data, error } = await supabase
    .from('listings')
    .select('id, title, is_active')
    .eq('is_active', true)
    .limit(10);

  if (error) {
    console.log('❌ Current state: Seekers CANNOT see listings');
    console.log('   Error:', error.message);
    console.log('\n🚨 RLS policies are blocking anonymous users!');

    console.log('\n📋 To fix this, please run the following SQL in Supabase Dashboard:');
    console.log('   Go to: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/editor\n');

    const sqlFix = `
-- IMPORTANT: This will allow seekers to view active listings!

-- Step 1: Drop any existing restrictive policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.listings;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.listings;
DROP POLICY IF EXISTS "Enable update for users based on provider_id" ON public.listings;
DROP POLICY IF EXISTS "Enable delete for users based on provider_id" ON public.listings;
DROP POLICY IF EXISTS "Listings are viewable by everyone" ON public.listings;
DROP POLICY IF EXISTS "Anyone can view active listings" ON public.listings;

-- Step 2: Create new permissive policy for viewing active listings
-- This is the KEY policy that allows seekers to see listings!
CREATE POLICY "Public can view active listings"
ON public.listings
FOR SELECT
USING (is_active = true);

-- Step 3: Provider policies (these don't affect seekers)
CREATE POLICY "Providers view own listings"
ON public.listings
FOR SELECT
USING (auth.uid() = provider_id);

CREATE POLICY "Providers create own listings"
ON public.listings
FOR INSERT
WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Providers update own listings"
ON public.listings
FOR UPDATE
USING (auth.uid() = provider_id);

-- Verify the fix worked
SELECT COUNT(*) as active_listings FROM public.listings WHERE is_active = true;
    `;

    console.log(sqlFix);

  } else {
    console.log('✅ Current state: Seekers CAN see listings!');
    console.log(`   Found ${data?.length || 0} active listings:`);

    if (data && data.length > 0) {
      data.forEach((listing, i) => {
        console.log(`   ${i + 1}. ${listing.title} (ID: ${listing.id})`);
      });
    } else {
      console.log('   (No active listings in database)');
    }
  }

  // Also check with service key to see what's actually in the database
  console.log('\n📊 Checking actual database state...');

  const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4OTg4NiwiZXhwIjoyMDczOTY1ODg2fQ.J9Oc77ZR1E435SqDsngt8ey4_WVOeTE6UASlYo17Gbc';
  const adminSupabase = createClient(supabaseUrl, serviceKey);

  const { data: allData, count } = await adminSupabase
    .from('listings')
    .select('*', { count: 'exact' })
    .eq('is_active', true);

  console.log(`   Total active listings in database: ${count || 0}`);

  if (count > 0 && (!data || data.length === 0)) {
    console.log('\n⚠️  There ARE active listings but seekers cannot see them!');
    console.log('   This confirms it\'s an RLS policy issue.');
    console.log('   Please run the SQL fix above in Supabase Dashboard.');
  }
}

applyRLSFix().catch(console.error);