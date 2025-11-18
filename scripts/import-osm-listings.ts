/**
 * OSM Listings Import Script
 *
 * This script imports OpenStreetMap shelter data into the internal listings table.
 * It converts OSM data to the internal format and assigns it to the system provider.
 *
 * Usage:
 *   ts-node scripts/import-osm-listings.ts
 *
 * Environment variables required:
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY (not anon key - needs to bypass RLS)
 */

import { createClient } from '@supabase/supabase-js';

// We'll fetch an existing provider ID from the database
// OSM listings will be assigned to the first available provider
let SYSTEM_PROVIDER_ID: string | null = null;

// Default import location (Los Angeles)
const DEFAULT_LAT = 34.0522;
const DEFAULT_LNG = -118.2437;
const DEFAULT_RADIUS_KM = 50; // 50km radius

// Supabase client with service role (bypasses RLS)
const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - SUPABASE_URL or EXPO_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Fetch OSM shelter data using Overpass API
 */
async function fetchOSMShelters(lat: number, lng: number, radiusKm: number) {
  const query = `
    [out:json][timeout:25];
    (
      node["social_facility"="homeless_shelter"](around:${radiusKm * 1000},${lat},${lng});
      node["social_facility"="shelter"]["social_facility:for"~"homeless"](around:${radiusKm * 1000},${lat},${lng});
      node["amenity"="shelter"]["shelter:for"~"homeless"](around:${radiusKm * 1000},${lat},${lng});
      node["name"~"homeless|emergency shelter|crisis|transitional|rescue mission",i](around:${radiusKm * 1000},${lat},${lng});
    );
    out body center;
  `;

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
      headers: { 'Content-Type': 'text/plain' },
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ Fetched ${data.elements?.length || 0} OSM elements`);
    return data.elements || [];
  } catch (error) {
    console.error('❌ Error fetching OSM data:', error);
    throw error;
  }
}

/**
 * Convert OSM element to internal listing format
 */
function convertOSMToListing(element: any) {
  const tags = element.tags || {};

  // Get coordinates
  const lat = element.lat || element.center?.lat;
  const lng = element.lon || element.center?.lon;

  if (!lat || !lng || !tags.name) {
    return null; // Skip if missing critical data
  }

  // Build address
  const street = tags['addr:street'] || tags['addr:housenumber'] || '';
  const city = tags['addr:city'] || tags['addr:town'] || 'Los Angeles';
  const state = tags['addr:state'] || 'CA';
  const zipCode = tags['addr:postcode'] || '';
  const address = street || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

  // Determine housing type
  const housingType = tags.social_facility === 'homeless_shelter'
    ? 'emergency_shelter'
    : 'transitional_housing';

  // Build description
  const description = buildDescription(tags);

  // Extract amenities
  const amenities = extractAmenities(tags);

  // Build listing object
  return {
    // External ID stored in title as prefix for tracking
    title: tags.name,
    description,
    provider_id: SYSTEM_PROVIDER_ID,
    source: 'osm',

    // Location
    address,
    city,
    state,
    zip_code: zipCode,
    lat,
    lng,

    // Type
    housing_type: housingType,

    // Beds (estimate from capacity if available)
    unit_beds: extractBeds(tags),
    ada_beds: tags.wheelchair === 'yes' ? 2 : 0,

    // Features
    amenities,
    accessibility: extractAccessibility(tags),
    eligibility: extractEligibility(tags),
    services: extractServices(tags),
    rules: {},

    // Cost
    cost: {
      monthly_min: 0,
      monthly_max: 0,
      deposit: 0,
      fees: [],
      accepts_vouchers: false,
    },

    // Availability
    availability: {
      beds_today: 0,
      beds_week: 0,
      waitlist: 0,
      last_updated_at: null,
    },

    // Contact
    intake: {
      phone: tags.phone || tags['contact:phone'] || '',
      email: tags.email || tags['contact:email'] || '',
      website: tags.website || tags['contact:website'] || '',
      hours: tags.opening_hours || '',
    },

    // Images
    images: extractImages(tags),

    // Metadata
    verified: false,
    is_active: true,
    dv_sensitive: false,
    certifications: [],
    responsiveness: {},
  };
}

function buildDescription(tags: any): string {
  const parts = [];

  if (tags.description) {
    parts.push(tags.description);
  } else {
    parts.push(`Emergency shelter providing housing assistance.`);
  }

  if (tags.operator) {
    parts.push(`Operated by ${tags.operator}.`);
  }

  if (tags.capacity || tags.beds) {
    const capacity = tags.capacity || tags.beds;
    parts.push(`Capacity: ${capacity} beds.`);
  }

  if (tags.opening_hours) {
    parts.push(`Hours: ${tags.opening_hours}`);
  }

  return parts.join(' ');
}

function extractBeds(tags: any) {
  const capacity = parseInt(tags.capacity || tags.beds || '0', 10);

  if (capacity > 0) {
    return {
      single: capacity,
      double: 0,
      family: 0,
    };
  }

  return {
    single: 0,
    double: 0,
    family: 0,
  };
}

function extractAmenities(tags: any) {
  const amenities: any = {
    wifi: tags.internet_access === 'yes' || tags.wifi === 'yes',
    parking: tags.parking === 'yes',
    laundry: tags.laundry === 'yes',
    kitchen: tags.kitchen === 'yes',
    meals: tags['service:meals'] === 'yes',
    storage: tags.storage === 'yes',
    showers: tags.shower === 'yes' || tags.showers === 'yes',
  };

  return amenities;
}

function extractAccessibility(tags: any) {
  return {
    wheelchair_accessible: tags.wheelchair === 'yes',
    elevator: tags.elevator === 'yes',
    ramp: tags.ramp === 'yes',
  };
}

function extractEligibility(tags: any) {
  const eligibility: any = {};

  // Check who it serves
  const servesFor = tags['social_facility:for'] || '';
  if (servesFor.includes('family')) eligibility.families = true;
  if (servesFor.includes('veteran')) eligibility.veterans = true;
  if (servesFor.includes('youth')) eligibility.youth = true;
  if (servesFor.includes('senior')) eligibility.seniors = true;
  if (tags.gender) eligibility.gender = tags.gender;

  return eligibility;
}

function extractServices(tags: any) {
  return {
    mental_health: tags['service:mental_health'] === 'yes',
    substance_abuse: tags['service:substance_abuse'] === 'yes',
    job_training: tags['service:job_training'] === 'yes',
    medical: tags['healthcare'] === 'yes',
  };
}

function extractImages(tags: any): string[] {
  const images: string[] = [];

  // Check for image tags
  if (tags.image) images.push(tags.image);
  if (tags['image:0']) images.push(tags['image:0']);

  return images;
}

/**
 * Import OSM listings into the database
 */
async function importListings() {
  console.log('🚀 Starting OSM listings import...\n');

  // Step 1: Find an existing provider to assign OSM listings to
  console.log('1️⃣  Finding provider account for OSM listings...');
  const { data: providers, error: providerError } = await supabase
    .from('profiles')
    .select('id, username, full_name')
    .eq('role', 'provider')
    .limit(1);

  if (providerError || !providers || providers.length === 0) {
    console.error('❌ No provider accounts found in database.');
    console.error('   Please create at least one provider account first.');
    console.error('   OSM listings need to be associated with a provider.');
    process.exit(1);
  }

  SYSTEM_PROVIDER_ID = providers[0].id;
  console.log(`✅ Using provider: ${providers[0].full_name || providers[0].username}`);
  console.log(`   ID: ${SYSTEM_PROVIDER_ID}\n`);

  // Step 2: Fetch OSM data
  console.log('2️⃣  Fetching OSM shelter data...');
  const osmElements = await fetchOSMShelters(DEFAULT_LAT, DEFAULT_LNG, DEFAULT_RADIUS_KM);
  console.log(`   Found ${osmElements.length} shelters\n`);

  // Step 3: Convert to internal format
  console.log('3️⃣  Converting to internal format...');
  const listings = osmElements
    .map(convertOSMToListing)
    .filter((listing): listing is NonNullable<typeof listing> => listing !== null);
  console.log(`   Converted ${listings.length} valid listings\n`);

  if (listings.length === 0) {
    console.log('⚠️  No valid listings to import');
    return;
  }

  // Step 4: Delete existing OSM listings (to avoid duplicates)
  console.log('4️⃣  Clearing existing OSM listings...');
  const { error: deleteError } = await supabase
    .from('listings')
    .delete()
    .eq('source', 'osm');

  if (deleteError) {
    console.warn('⚠️  Error deleting old listings:', deleteError.message);
  } else {
    console.log('✅ Cleared old OSM listings\n');
  }

  // Step 5: Insert new listings in batches
  console.log('5️⃣  Inserting listings into database...');
  const BATCH_SIZE = 50;
  let inserted = 0;
  let failed = 0;

  for (let i = 0; i < listings.length; i += BATCH_SIZE) {
    const batch = listings.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from('listings')
      .insert(batch)
      .select('id');

    if (error) {
      console.error(`   ❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, error.message);
      failed += batch.length;
    } else {
      inserted += data?.length || 0;
      console.log(`   ✅ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${data?.length || 0} listings inserted`);
    }
  }

  // Step 6: Summary
  console.log('\n📊 Import Summary:');
  console.log(`   Total fetched: ${osmElements.length}`);
  console.log(`   Valid listings: ${listings.length}`);
  console.log(`   ✅ Inserted: ${inserted}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log('\n✨ Import complete!');
}

// Run the import
importListings().catch((error) => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
