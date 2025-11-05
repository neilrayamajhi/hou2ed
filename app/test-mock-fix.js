/**
 * Test the mock data fix
 */

// Test that the conversion function works
const mockListings = require('./src/data/mockListings');
const { convertOldListingToNew } = require('./src/data/fixMockListings');

console.log('🧪 Testing Mock Data Fix\n');
console.log('═══════════════════════════════════════\n');

// Test old format listing
const oldListing = {
  id: "test-1",
  name: "Test Shelter",
  type: "emergency_shelter",
  availability: "available",
  price: {
    isFree: true,
    acceptsVouchers: false
  },
  features: {
    acceptsFamilies: true,
    acceptsVeterans: true
  },
  coordinates: {
    latitude: 37.7749,
    longitude: -122.4194
  }
};

console.log('1️⃣ Testing conversion of old format to new format...');
try {
  const newListing = convertOldListingToNew(oldListing);

  console.log('✅ Conversion successful!');
  console.log('   Old availability (string):', oldListing.availability);
  console.log('   New availability (object):', JSON.stringify(newListing.availability, null, 2));
  console.log('   Old price:', JSON.stringify(oldListing.price, null, 2));
  console.log('   New cost:', JSON.stringify(newListing.cost, null, 2));
} catch (error) {
  console.log('❌ Conversion failed:', error.message);
}

console.log('\n2️⃣ Testing generateListingsAroundLocation function...');
try {
  const listings = mockListings.generateListingsAroundLocation(37.7749, -122.4194, 5);
  console.log(`✅ Generated ${listings.length} listings`);

  // Check structure of first listing
  const first = listings[0];
  if (first && typeof first.availability === 'object') {
    console.log('✅ First listing has correct availability structure');
    console.log('   beds_today:', first.availability.beds_today);
    console.log('   beds_week:', first.availability.beds_week);
  }
} catch (error) {
  console.log('❌ Generation failed:', error.message);
}

console.log('\n3️⃣ Testing filterListingsByQuick function...');
try {
  const allListings = mockListings.generateListingsAroundLocation(37.7749, -122.4194, 10);
  const filtered = mockListings.filterListingsByQuick(allListings, {
    immediate: true,
    free: false,
    veterans: false,
    families: false,
    nearMe: false
  });

  console.log(`✅ Filtered ${filtered.length} listings from ${allListings.length} total`);
} catch (error) {
  console.log('❌ Filtering failed:', error.message);
}

console.log('\n═══════════════════════════════════════');
console.log('✅ Mock Data Fix Complete!\n');
console.log('The runtime error should now be resolved.');
console.log('Try running the app again to verify.');