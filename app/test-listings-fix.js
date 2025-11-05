const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4OTg4NiwiZXhwIjoyMDczOTY1ODg2fQ.J9Oc77ZR1E435SqDsngt8ey4_WVOeTE6UASlYo17Gbc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testListingsFetch() {
  console.log('\n📋 Testing Listings Fetch...\n');

  try {
    // Test fetching listings
    const { data, error } = await supabase
      .from('listings')
      .select(`
        *,
        provider:profiles!listings_provider_id_fkey (
          id,
          full_name,
          provider_profile
        )
      `)
      .eq('is_active', true)
      .limit(5);

    if (error) {
      console.error('❌ Error fetching listings:', error);
      return;
    }

    console.log(`✅ Found ${data?.length || 0} active listings\n`);

    // Show basic info for each listing
    data?.forEach((listing, index) => {
      console.log(`Listing ${index + 1}:`);
      console.log(`  - Title: ${listing.title}`);
      console.log(`  - Type: ${listing.housing_type}`);
      console.log(`  - Provider: ${listing.provider?.full_name}`);
      console.log(`  - Location: ${listing.city}, ${listing.state}`);
      console.log(`  - Availability: ${listing.availability?.beds_today || 0} beds`);
      console.log(`  - Free: ${listing.cost?.free ? 'Yes' : 'No'}`);
      console.log(`  - Veterans: ${listing.eligibility?.veterans ? 'Yes' : 'No'}`);
      console.log('');
    });

    // Test the transformed structure
    if (data && data.length > 0) {
      const firstListing = data[0];
      console.log('🔍 First listing structure check:');
      console.log(`  - Has coordinates: ${!!(firstListing.lat && firstListing.lng)}`);
      console.log(`  - Has address: ${!!firstListing.address}`);
      console.log(`  - Has price info: ${!!firstListing.cost}`);
      console.log(`  - Has features: ${!!firstListing.eligibility}`);
      console.log(`  - Has availability: ${!!firstListing.availability}`);
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

// Run the test
testListingsFetch();