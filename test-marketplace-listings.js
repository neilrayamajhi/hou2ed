const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testMarketplaceListings() {
  console.log('Testing marketplace listings fetch...\n');

  try {
    // Test 1: Count all listings
    const { count: totalCount } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true });

    console.log(`Total listings in database: ${totalCount}`);

    // Test 2: Count active listings
    const { count: activeCount } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    console.log(`Active listings: ${activeCount}`);

    // Test 3: Fetch active listings (same query as marketplace)
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching listings:', error);
      return;
    }

    console.log(`\nFetched ${data?.length || 0} active listings`);

    if (data && data.length > 0) {
      console.log('\nFirst 3 listings:');
      data.slice(0, 3).forEach((listing, i) => {
        console.log(`\n${i + 1}. ${listing.title}`);
        console.log(`   ID: ${listing.id}`);
        console.log(`   Provider: ${listing.provider_id}`);
        console.log(`   Active: ${listing.is_active}`);
        console.log(`   Address: ${listing.address}`);
        console.log(`   Created: ${listing.created_at}`);

        // Check beds
        const unitBeds = listing.unit_beds || {};
        const totalBeds = Object.values(unitBeds).reduce((sum, count) => sum + (count || 0), 0);
        console.log(`   Total beds: ${totalBeds}`);

        // Check availability
        const availability = listing.availability || {};
        console.log(`   Available beds: ${availability.beds_today || 0}`);
      });
    } else {
      console.log('\nNo active listings found!');
      console.log('This is why the seeker side shows mock data.');

      // Test 4: Check if there are any inactive listings
      const { data: inactiveData } = await supabase
        .from('listings')
        .select('id, title, is_active, provider_id')
        .eq('is_active', false)
        .limit(5);

      if (inactiveData && inactiveData.length > 0) {
        console.log('\nFound inactive listings:');
        inactiveData.forEach(l => {
          console.log(`  - ${l.title} (Provider: ${l.provider_id})`);
        });
      }
    }

    // Test 5: Try to fetch with simpler query
    console.log('\n\nTrying simplest possible query:');
    const { data: simpleData, error: simpleError } = await supabase
      .from('listings')
      .select('id, title, is_active')
      .limit(5);

    if (simpleError) {
      console.error('Simple query error:', simpleError);
    } else {
      console.log(`Found ${simpleData?.length || 0} listings (any status)`);
      simpleData?.forEach(l => {
        console.log(`  - ${l.title} (Active: ${l.is_active})`);
      });
    }

  } catch (err) {
    console.error('Test failed:', err);
  }
}

testMarketplaceListings();