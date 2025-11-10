const https = require('https');

async function executeSQL() {
  const projectRef = 'rixiofltzptwaiwxhhlf';
  const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4OTg4NiwiZXhwIjoyMDczOTY1ODg2fQ.J9Oc77ZR1E435SqDsngt8ey4_WVOeTE6UASlYo17Gbc';

  const sql = `
-- Fix RLS policies for listings table
DO $$
BEGIN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Enable read access for all users" ON public.listings;
    DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.listings;
    DROP POLICY IF EXISTS "Enable update for users based on provider_id" ON public.listings;
    DROP POLICY IF EXISTS "Enable delete for users based on provider_id" ON public.listings;
    DROP POLICY IF EXISTS "anon_can_view_active_listings" ON public.listings;
    DROP POLICY IF EXISTS "providers_can_view_own_listings" ON public.listings;
    DROP POLICY IF EXISTS "providers_can_create_listings" ON public.listings;
    DROP POLICY IF EXISTS "providers_can_update_own_listings" ON public.listings;
    DROP POLICY IF EXISTS "providers_can_delete_own_listings" ON public.listings;
EXCEPTION WHEN undefined_object THEN
    NULL;
END $$;

-- Create new policies
CREATE POLICY "anon_can_view_active_listings" ON public.listings FOR SELECT USING (is_active = true);
CREATE POLICY "providers_can_view_own_listings" ON public.listings FOR SELECT USING (auth.uid() = provider_id);
CREATE POLICY "providers_can_create_listings" ON public.listings FOR INSERT WITH CHECK (auth.uid() = provider_id);
CREATE POLICY "providers_can_update_own_listings" ON public.listings FOR UPDATE USING (auth.uid() = provider_id) WITH CHECK (auth.uid() = provider_id);
CREATE POLICY "providers_can_delete_own_listings" ON public.listings FOR DELETE USING (auth.uid() = provider_id);

-- Grant permissions
GRANT SELECT ON public.listings TO anon;
`;

  console.log('🔧 Executing RLS fix via Supabase API...\n');

  // Use the REST API to execute raw SQL
  const options = {
    hostname: `${projectRef}.supabase.co`,
    port: 443,
    path: '/rest/v1/rpc',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 204) {
          console.log('✅ SQL executed successfully!');
          testAccess();
        } else {
          console.log('Response status:', res.statusCode);
          console.log('Response:', data);

          // Try alternative approach
          console.log('\n⚠️ Direct API execution not available.');
          console.log('📋 Please run this SQL in Supabase Dashboard:');
          console.log('   https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/editor\n');
          console.log(sql);
        }
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error('Request error:', error);
      reject(error);
    });

    req.write(JSON.stringify({ query: sql }));
    req.end();
  });
}

async function testAccess() {
  const { createClient } = require('@supabase/supabase-js');

  const supabaseUrl = 'https://rixiofltzptwaiwxhhlf.supabase.co';
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

  const supabase = createClient(supabaseUrl, anonKey);

  console.log('\n🧪 Testing anonymous access to listings...');

  const { data, error } = await supabase
    .from('listings')
    .select('id, title, is_active')
    .eq('is_active', true)
    .limit(5);

  if (error) {
    console.log('❌ Anonymous users still CANNOT see listings');
    console.log('   Error:', error.message);
  } else if (data && data.length > 0) {
    console.log('✅ SUCCESS! Anonymous users can now see listings!');
    console.log(`   Found ${data.length} active listings:`);
    data.forEach(l => console.log(`     - ${l.title}`));
  } else {
    console.log('⚠️ Query succeeded but no active listings found');
    console.log('   You may need to mark some listings as active');
  }
}

executeSQL().catch(console.error);