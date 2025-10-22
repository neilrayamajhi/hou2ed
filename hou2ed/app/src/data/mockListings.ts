/**
 * Mock data for housing listings
 */

import type { Listing, HousingType } from "../types/listing";

// Valid housing types from the Listing type
const HOUSING_TYPES: HousingType[] = [
  'shelter',
  'transitional',
  'apartment',
  'shared_room',
  'private_room',
  'house',
  'sober_living',
];

const FACILITY_NAMES = [
  "Haven Emergency Shelter",
  "Bridge Housing Center",
  "New Beginnings Transitional",
  "Safe Harbor Shelter",
  "Veterans First Housing",
  "Hope House",
  "Second Chance Living",
  "Family Promise Center",
  "Recovery Road Sober Living",
  "Youth Pathways",
  "Compass Point Housing",
  "Liberty Veterans Housing",
  "Fresh Start Homes",
  "Unity Supportive Housing",
  "Sunrise Recovery Center",
  "Peaceful Haven Shelter",
  "Community Care Center",
  "Stepping Stones Housing",
  "Journey Home Center",
  "Beacon of Hope Shelter",
];

// Helper to create a mock listing
function createMockListing(index: number, lat?: number, lng?: number): Listing {
  const housingType = HOUSING_TYPES[index % HOUSING_TYPES.length];
  const bedsToday = Math.floor(Math.random() * 10);
  const isFree = Math.random() > 0.6;
  const baseLat = lat ?? 37.7749;
  const baseLng = lng ?? -122.4194;

  // Generate random offset within ~5 mile radius
  const latOffset = (Math.random() - 0.5) * 0.1;
  const lngOffset = (Math.random() - 0.5) * 0.1;
  const distance = Math.round(Math.sqrt(latOffset * latOffset + lngOffset * lngOffset) * 69 * 10) / 10;

  return {
    id: `mock-${index + 1}`,
    provider_id: `provider-${(index % 5) + 1}`,
    title: FACILITY_NAMES[index % FACILITY_NAMES.length],
    description: `24/7 ${housingType.replace(/_/g, ' ')} providing immediate housing and support services. Safe, clean environment with meals included.`,
    address: `${Math.floor(Math.random() * 9000) + 100} Main St`,
    city: "San Francisco",
    state: "CA",
    zip_code: `${Math.floor(Math.random() * 90000) + 10000}`,
    lat: baseLat + latOffset,
    lng: baseLng + lngOffset,
    housing_type: housingType,
    unit_beds: {
      single_occupancy: Math.floor(Math.random() * 20) + 5,
      double_occupancy: Math.floor(Math.random() * 10),
    },
    ada_beds: Math.floor(Math.random() * 3),
    gender_rooming: ['male', 'female', 'co_ed'][Math.floor(Math.random() * 3)] as any,
    amenities: {
      basic: ['wifi', 'laundry', 'meals'].filter(() => Math.random() > 0.3),
      kitchen: ['microwave', 'refrigerator'].filter(() => Math.random() > 0.5),
    },
    accessibility: {
      mobility: ['wheelchair_accessible', 'elevator'].filter(() => Math.random() > 0.6),
    },
    eligibility: {
      age_range: [18, 100],
      veterans: Math.random() > 0.5,
    },
    services: {
      case_management: Math.random() > 0.5,
      medical: ['primary_care', 'mental_health'].filter(() => Math.random() > 0.6),
    },
    rules: {
      curfew: Math.random() > 0.5 ? '10:00 PM' : undefined,
      substances: ['no_alcohol', 'no_drugs'],
    },
    cost: isFree ? {
      free: true,
      monthly: 0,
    } : {
      free: false,
      monthly: Math.floor(Math.random() * 800) + 200,
      accepts: ['vouchers', 'insurance'],
    },
    intake: {
      process: ['walk_in', 'appointment', 'referral'][Math.floor(Math.random() * 3)] as any,
      hours: '24/7',
    },
    availability: {
      beds_today: bedsToday,
      beds_week: Math.floor(Math.random() * 20) + bedsToday,
      waitlist: Math.floor(Math.random() * 15),
      last_updated_at: new Date().toISOString(),
    },
    verified: Math.random() > 0.3,
    certifications: [],
    images: [`https://via.placeholder.com/400x300/1a1a1a/D4AF37?text=Listing+${index + 1}`],
    responsiveness: {
      response_rate: Math.random() * 0.5 + 0.5,
      average_response_time: '2 hours',
    },
    dv_sensitive: false,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    provider: {
      id: `provider-${(index % 5) + 1}`,
      full_name: `Provider ${(index % 5) + 1}`,
      username: `provider${(index % 5) + 1}`,
      is_verified: Math.random() > 0.5,
    },
    distance,
  };
}

// Function to generate listings around a specific location
export function generateListingsAroundLocation(
  latitude: number,
  longitude: number,
  count: number = 20
): Listing[] {
  const listings: Listing[] = [];

  for (let i = 0; i < count; i++) {
    listings.push(createMockListing(i, latitude, longitude));
  }

  return listings.sort((a, b) => (a.distance || 0) - (b.distance || 0));
}

// Generate mock listings
export function generateMockListings(count: number = 20): Listing[] {
  const listings: Listing[] = [];

  for (let i = 0; i < count; i++) {
    listings.push(createMockListing(i));
  }

  return listings;
}

// Pre-generated mock listings for testing
export const mockListings: Listing[] = generateMockListings(20);

// Filter listings by quick filters
export function filterListingsByQuick(
  listings: Listing[],
  quickFilters: Record<string, boolean>
): Listing[] {
  return listings.filter((listing) => {
    // If no filters are active, show all listings
    const activeFilters = Object.entries(quickFilters).filter(([_, active]) => active);
    if (activeFilters.length === 0) return true;

    // Check each active filter
    for (const [filter, active] of activeFilters) {
      if (!active) continue;

      switch (filter) {
        case 'available':
          if (listing.availability.beds_today <= 0) return false;
          break;
        case 'free':
          if (!listing.cost?.free) return false;
          break;
        case 'families':
          if (!listing.eligibility?.family_status?.includes('families')) return false;
          break;
        case 'veterans':
          if (!listing.eligibility?.veterans) return false;
          break;
        case 'wheelchair':
          if (!listing.accessibility?.mobility?.includes('wheelchair_accessible')) return false;
          break;
      }
    }

    return true;
  });
}
