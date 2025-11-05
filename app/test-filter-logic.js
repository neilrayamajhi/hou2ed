const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4OTg4NiwiZXhwIjoyMDczOTY1ODg2fQ.J9Oc77ZR1E435SqDsngt8ey4_WVOeTE6UASlYo17Gbc';

const supabase = createClient(supabaseUrl, supabaseKey);

// Transform function (simplified version from marketplace.service.ts)
function transformToMarketplace(dbListing) {
  const totalBeds = Object.values(dbListing.unit_beds || {}).reduce(
    (sum, count) => sum + (count || 0),
    0
  );

  const bedsAvailable = dbListing.availability?.beds_today || 0;
  let availability = "unknown";
  if (bedsAvailable > 0) {
    availability = "available";
  } else if (dbListing.availability?.waitlist > 0) {
    availability = "waitlist";
  } else {
    availability = "full";
  }

  const monthlyPrice = dbListing.cost?.monthly || 0;
  const isFree = dbListing.cost?.free || monthlyPrice === 0;

  const acceptsFamilies =
    dbListing.gender_rooming === "family" ||
    dbListing.eligibility?.family_status?.includes("families") ||
    false;

  return {
    id: dbListing.id,
    name: dbListing.title,
    type: dbListing.housing_type || "shelter",
    availability,
    bedsAvailable,
    totalBeds,
    price: {
      min: monthlyPrice,
      max: monthlyPrice,
      isFree,
    },
    features: {
      acceptsFamilies,
      acceptsVeterans: dbListing.eligibility?.veterans || false,
    },
    distance: 1.5, // Mock distance for testing
  };
}

// Filter function (from mockListings.ts)
function filterListingsByQuick(listings, quickFilters) {
  const activeFilters = Object.values(quickFilters).some(v => v);
  if (!activeFilters) {
    console.log("📝 No active filters, returning all listings");
    return listings;
  }

  let filtered = [...listings];

  if (quickFilters.immediate) {
    const before = filtered.length;
    filtered = filtered.filter(l => l.availability === "available");
    console.log(`  - immediate filter: ${before} → ${filtered.length} listings`);
  }

  if (quickFilters.free) {
    const before = filtered.length;
    filtered = filtered.filter(l => l.price?.isFree === true);
    console.log(`  - free filter: ${before} → ${filtered.length} listings`);
  }

  if (quickFilters.veterans) {
    const before = filtered.length;
    filtered = filtered.filter(l => l.features?.acceptsVeterans === true);
    console.log(`  - veterans filter: ${before} → ${filtered.length} listings`);
  }

  if (quickFilters.families) {
    const before = filtered.length;
    filtered = filtered.filter(l => l.features?.acceptsFamilies === true);
    console.log(`  - families filter: ${before} → ${filtered.length} listings`);
  }

  if (quickFilters.nearMe) {
    const before = filtered.length;
    filtered = filtered.filter(l => (l.distance || 0) < 2);
    console.log(`  - nearMe filter: ${before} → ${filtered.length} listings`);
  }

  return filtered;
}

async function testFilterLogic() {
  console.log('\n🧪 Testing Filter Logic with Real Data\n');

  try {
    // Fetch listings
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log(`✅ Found ${data?.length || 0} active listings\n`);

    // Transform listings
    const transformed = data.map(transformToMarketplace);

    // Show listing details
    console.log('📋 Listing Details:');
    transformed.forEach((listing, index) => {
      console.log(`\n${index + 1}. ${listing.name}:`);
      console.log(`   - Availability: ${listing.availability} (${listing.bedsAvailable} beds)`);
      console.log(`   - Price: ${listing.price.isFree ? 'FREE' : '$' + listing.price.min}`);
      console.log(`   - Veterans: ${listing.features.acceptsVeterans ? 'Yes' : 'No'}`);
      console.log(`   - Families: ${listing.features.acceptsFamilies ? 'Yes' : 'No'}`);
      console.log(`   - Distance: ${listing.distance} mi`);
    });

    // Test different filter combinations
    console.log('\n🔍 Testing Filter Combinations:\n');

    const filterTests = [
      { name: 'No filters', filters: { immediate: false, free: false, veterans: false, families: false, nearMe: false } },
      { name: 'Immediate only', filters: { immediate: true, free: false, veterans: false, families: false, nearMe: false } },
      { name: 'Free only', filters: { immediate: false, free: true, veterans: false, families: false, nearMe: false } },
      { name: 'Near me only', filters: { immediate: false, free: false, veterans: false, families: false, nearMe: true } },
      { name: 'Immediate + Near', filters: { immediate: true, free: false, veterans: false, families: false, nearMe: true } },
    ];

    filterTests.forEach(test => {
      console.log(`\n${test.name}:`);
      const filtered = filterListingsByQuick(transformed, test.filters);
      console.log(`  Result: ${filtered.length} listings`);
      if (filtered.length > 0) {
        console.log(`  First: ${filtered[0].name}`);
      }
    });

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

// Run the test
testFilterLogic();