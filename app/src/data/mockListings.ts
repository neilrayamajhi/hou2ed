/**
 * Mock data for housing listings
 */

import type { Listing, HousingType } from "../types/listing";
import { convertOldListingToNew } from "./fixMockListings";

// Function to generate listings around a specific location
export function generateListingsAroundLocation(
  latitude: number,
  longitude: number,
  count: number = 20
): Listing[] {
  const listings: Listing[] = [];
  const housingTypes: HousingType[] = [
    "emergency_shelter",
    "transitional_housing",
    "rapid_rehousing",
    "permanent_supportive",
    "sober_living",
    "veterans_housing",
    "youth_housing",
    "domestic_violence_shelter",
  ];

  const names = [
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
    "Peaceful Haven DV Shelter",
    "Community Care Center",
    "Stepping Stones Housing",
    "Journey Home Center",
    "Beacon of Hope Shelter",
  ];

  for (let i = 0; i < count; i++) {
    // Generate random offset within ~5 mile radius
    const latOffset = (Math.random() - 0.5) * 0.1; // ~5 miles
    const lngOffset = (Math.random() - 0.5) * 0.1;

    const housingType = housingTypes[Math.floor(Math.random() * housingTypes.length)];
    const isAvailable = Math.random() > 0.3;
    const totalBeds = Math.floor(Math.random() * 50) + 10;
    const bedsAvailable = isAvailable ? Math.floor(Math.random() * totalBeds * 0.5) + 1 : 0;
    const isFree = Math.random() > 0.6;

    const oldFormatListing = {
      id: `loc-${i + 1}`,
      provider_id: `provider-${Math.floor(Math.random() * 10) + 1}`,
      name: names[i % names.length],
      type: housingType,
      description: `24/7 ${housingType.replace(/_/g, ' ')} providing immediate housing and support services. Safe, clean environment with meals included.`,
      coverImage: "https://via.placeholder.com/400x300",
      coordinates: {
        latitude: latitude + latOffset,
        longitude: longitude + lngOffset,
      },
      address: {
        street: `${Math.floor(Math.random() * 9000) + 100} Main St`,
        city: "Your City",
        state: "State",
        zipCode: `${Math.floor(Math.random() * 90000) + 10000}`,
      },
      distance: Math.round(Math.sqrt(latOffset * latOffset + lngOffset * lngOffset) * 69 * 10) / 10, // Convert to miles
      price: {
        min: isFree ? 0 : Math.floor(Math.random() * 500) + 200,
        max: isFree ? 0 : Math.floor(Math.random() * 800) + 400,
        isFree,
        acceptsVouchers: Math.random() > 0.5,
      },
      availability: isAvailable ? "available" : "full",
      bedsAvailable,
      totalBeds,
      amenities: ["Meals", "Showers", "Laundry", "Case Management", "Medical"],
      requirements: ["ID Required", "TB Test", "Background Check"],
      features: {
        acceptsFamilies: Math.random() > 0.5,
        acceptsVeterans: true,
        acceptsSingleMen: Math.random() > 0.3,
        acceptsSingleWomen: Math.random() > 0.3,
        petsAllowed: Math.random() > 0.7,
        wheelchairAccessible: Math.random() > 0.4,
        lgbtqFriendly: Math.random() > 0.3,
      },
      contact: {
        phone: `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
        email: "intake@shelter.org",
        hours: "24/7",
      },
      rating: Math.round((Math.random() * 2 + 3) * 10) / 10,
      reviewCount: Math.floor(Math.random() * 200) + 10,
      lastUpdated: new Date().toISOString(),
      provider: "Local Housing Authority",
      verified: Math.random() > 0.3,
    };

    // Convert to new format
    listings.push(convertOldListingToNew(oldFormatListing));
  }

  return listings.sort((a, b) => (a.distance || 0) - (b.distance || 0));
}

const oldFormatMockListings = [
  {
    id: "1",
    provider_id: "provider-haven-1",
    name: "Haven Emergency Shelter",
    type: "emergency_shelter",
    description:
      "24/7 emergency shelter providing immediate housing and support services. Safe, clean environment with meals included.",
    coverImage: "https://via.placeholder.com/400x300",
    coordinates: {
      latitude: 37.7749,
      longitude: -122.4194,
    },
    address: {
      street: "123 Mission St",
      city: "San Francisco",
      state: "CA",
      zipCode: "94103",
    },
    distance: 0.5,
    price: {
      min: 0,
      max: 0,
      isFree: true,
      acceptsVouchers: false,
    },
    availability: "available",
    bedsAvailable: 12,
    totalBeds: 50,
    amenities: ["Meals", "Showers", "Laundry", "Case Management", "Medical"],
    requirements: ["ID Required", "TB Test", "Background Check"],
    features: {
      acceptsFamilies: false,
      acceptsVeterans: true,
      acceptsSingleMen: true,
      acceptsSingleWomen: true,
      petsAllowed: false,
      wheelchairAccessible: true,
      lgbtqFriendly: true,
    },
    contact: {
      phone: "(415) 555-0100",
      email: "intake@haven.org",
      hours: "24/7",
    },
    rating: 4.2,
    reviewCount: 128,
    lastUpdated: new Date().toISOString(),
    provider: "Haven Foundation",
    verified: true,
  },
  {
    id: "2",
    provider_id: "provider-bridge-2",
    name: "Bridge Transitional Housing",
    type: "transitional_housing",
    description:
      "90-day transitional housing program with job training and life skills classes. Private rooms available.",
    coverImage: "https://via.placeholder.com/400x300",
    coordinates: {
      latitude: 37.7849,
      longitude: -122.4094,
    },
    address: {
      street: "456 Market St",
      city: "San Francisco",
      state: "CA",
      zipCode: "94102",
    },
    distance: 1.2,
    price: {
      min: 200,
      max: 400,
      isFree: false,
      acceptsVouchers: true,
    },
    availability: "waitlist",
    bedsAvailable: 0,
    totalBeds: 30,
    amenities: [
      "Private Room",
      "Kitchen",
      "WiFi",
      "Job Training",
      "Counseling",
    ],
    requirements: ["Income Verification", "Clean 30 Days", "Program Participation"],
    features: {
      acceptsFamilies: true,
      acceptsVeterans: true,
      acceptsSingleMen: true,
      acceptsSingleWomen: true,
      petsAllowed: false,
      wheelchairAccessible: false,
      lgbtqFriendly: true,
    },
    contact: {
      phone: "(415) 555-0200",
      hours: "9am-5pm M-F",
    },
    rating: 4.5,
    reviewCount: 67,
    lastUpdated: new Date().toISOString(),
    provider: "Bridge Housing Services",
    verified: true,
  },
  {
    id: "3",
    provider_id: "provider-veterans-3",
    name: "Veterans First Housing",
    type: "veterans_housing",
    description:
      "Permanent supportive housing exclusively for veterans. On-site VA services and peer support groups.",
    coverImage: "https://via.placeholder.com/400x300",
    coordinates: {
      latitude: 37.7649,
      longitude: -122.4294,
    },
    address: {
      street: "789 Geary St",
      city: "San Francisco",
      state: "CA",
      zipCode: "94109",
    },
    distance: 2.3,
    price: {
      min: 0,
      max: 0,
      isFree: true,
      acceptsVouchers: true,
    },
    availability: "available",
    bedsAvailable: 5,
    totalBeds: 40,
    amenities: [
      "VA Services",
      "Mental Health",
      "Substance Abuse Program",
      "Computer Lab",
      "Gym",
    ],
    requirements: ["Veteran Status", "DD-214", "VA Referral"],
    features: {
      acceptsFamilies: false,
      acceptsVeterans: true,
      acceptsSingleMen: true,
      acceptsSingleWomen: true,
      petsAllowed: true,
      wheelchairAccessible: true,
      lgbtqFriendly: true,
    },
    contact: {
      phone: "(415) 555-0300",
      email: "veterans@vfhousing.org",
      hours: "8am-6pm Daily",
    },
    rating: 4.7,
    reviewCount: 203,
    lastUpdated: new Date().toISOString(),
    provider: "Veterans First Foundation",
    verified: true,
  },
  {
    id: "4",
    provider_id: "provider-family-4",
    name: "Family Haven",
    type: "emergency_shelter",
    description:
      "Emergency shelter for families with children. Private family rooms, childcare, and school enrollment assistance.",
    coverImage: "https://via.placeholder.com/400x300",
    coordinates: {
      latitude: 37.7949,
      longitude: -122.3994,
    },
    address: {
      street: "321 Broadway",
      city: "San Francisco",
      state: "CA",
      zipCode: "94133",
    },
    distance: 1.8,
    price: {
      min: 0,
      max: 0,
      isFree: true,
      acceptsVouchers: false,
    },
    availability: "full",
    bedsAvailable: 0,
    totalBeds: 25,
    amenities: [
      "Family Rooms",
      "Childcare",
      "Playground",
      "School Support",
      "Meals",
    ],
    requirements: ["Family with Children", "Background Check"],
    features: {
      acceptsFamilies: true,
      acceptsVeterans: false,
      acceptsSingleMen: false,
      acceptsSingleWomen: false,
      petsAllowed: false,
      wheelchairAccessible: true,
      lgbtqFriendly: true,
    },
    contact: {
      phone: "(415) 555-0400",
      hours: "24/7",
    },
    rating: 4.4,
    reviewCount: 89,
    lastUpdated: new Date().toISOString(),
    provider: "Family Services SF",
    verified: true,
  },
  {
    id: "5",
    provider_id: "provider-serenity-5",
    name: "Serenity Sober Living",
    type: "sober_living",
    description:
      "Structured sober living environment with daily meetings and accountability. Shared rooms, drug testing required.",
    coverImage: "https://via.placeholder.com/400x300",
    coordinates: {
      latitude: 37.7549,
      longitude: -122.4394,
    },
    address: {
      street: "567 Oak St",
      city: "San Francisco",
      state: "CA",
      zipCode: "94117",
    },
    distance: 3.1,
    price: {
      min: 600,
      max: 800,
      isFree: false,
      acceptsVouchers: false,
    },
    availability: "available",
    bedsAvailable: 3,
    totalBeds: 20,
    amenities: [
      "Daily Meetings",
      "Peer Support",
      "Kitchen",
      "Laundry",
      "Transportation",
    ],
    requirements: [
      "30 Days Clean",
      "Drug Testing",
      "Meeting Attendance",
      "Curfew",
    ],
    features: {
      acceptsFamilies: false,
      acceptsVeterans: true,
      acceptsSingleMen: true,
      acceptsSingleWomen: false,
      petsAllowed: false,
      wheelchairAccessible: false,
      lgbtqFriendly: true,
    },
    contact: {
      phone: "(415) 555-0500",
      hours: "9am-9pm Daily",
    },
    rating: 4.6,
    reviewCount: 156,
    lastUpdated: new Date().toISOString(),
    provider: "Serenity House",
    verified: true,
  },
  {
    id: "6",
    provider_id: "provider-youth-6",
    name: "Youth Forward Housing",
    type: "youth_housing",
    description:
      "Transitional housing for youth 18-24. Education support, job training, and life skills development.",
    coverImage: "https://via.placeholder.com/400x300",
    coordinates: {
      latitude: 37.7849,
      longitude: -122.4494,
    },
    address: {
      street: "890 Polk St",
      city: "San Francisco",
      state: "CA",
      zipCode: "94109",
    },
    distance: 2.7,
    price: {
      min: 0,
      max: 300,
      isFree: false,
      acceptsVouchers: true,
    },
    availability: "available",
    bedsAvailable: 8,
    totalBeds: 35,
    amenities: [
      "Education Support",
      "Job Training",
      "Computer Lab",
      "Recreation Room",
      "Counseling",
    ],
    requirements: ["Age 18-24", "Student or Employed", "Case Management"],
    features: {
      acceptsFamilies: false,
      acceptsVeterans: false,
      acceptsSingleMen: true,
      acceptsSingleWomen: true,
      petsAllowed: false,
      wheelchairAccessible: true,
      lgbtqFriendly: true,
    },
    contact: {
      phone: "(415) 555-0600",
      email: "youth@forward.org",
      hours: "8am-8pm Daily",
    },
    rating: 4.3,
    reviewCount: 92,
    lastUpdated: new Date().toISOString(),
    provider: "Youth Forward Initiative",
    verified: true,
  },
];

// Convert old format listings to new format
export const mockListings: Listing[] = oldFormatMockListings.map((listing) => {
  try {
    return convertOldListingToNew(listing);
  } catch (error) {
    console.error("Failed to convert listing:", listing?.id, error);
    // Return a minimal valid listing as fallback
    return {
      id: listing?.id || "unknown",
      provider_id: listing?.provider_id || "unknown",
      title: listing?.name || "Unknown Listing",
      description: listing?.description || "",
      address: "Unknown",
      city: "San Francisco",
      state: "CA",
      zip_code: "94102",
      lat: 37.7749,
      lng: -122.4194,
      housing_type: "emergency_shelter" as any,
      unit_beds: { single_occupancy: 0 },
      ada_beds: 0,
      availability: {
        beds_today: 0,
        beds_week: 0,
        waitlist: 0,
        last_updated_at: null
      },
      verified: false,
      images: [],
      dv_sensitive: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as Listing;
  }
});

/**
 * Generate more mock listings with variations
 */
export function generateMockListings(count: number = 20): Listing[] {
  const baseListings = [...mockListings];
  const generated: Listing[] = [];

  for (let i = 0; i < count; i++) {
    const base = baseListings[i % baseListings.length];

    // Calculate total beds from unit_beds
    const totalBeds = base.unit_beds
      ? Object.values(base.unit_beds).reduce((sum, val) => sum + val, 0)
      : 10;

    const variation: Listing = {
      ...base,
      id: `gen-${i}`,
      provider_id: base.provider_id || `provider-gen-${i}`,
      title: `${base.title} ${i + 1}`,
      lat: base.lat + (Math.random() - 0.5) * 0.1,
      lng: base.lng + (Math.random() - 0.5) * 0.1,
      distance: Math.random() * 10,
      availability: {
        beds_today: Math.floor(Math.random() * totalBeds * 0.5),
        beds_week: Math.floor(Math.random() * totalBeds * 0.7),
        waitlist: Math.random() > 0.5 ? Math.floor(Math.random() * 10) : 0,
        last_updated_at: new Date().toISOString()
      }
    };
    generated.push(variation);
  }

  return [...baseListings, ...generated];
}

/**
 * Filter listings based on quick filters
 */
export function filterListingsByQuick(
  listings: Listing[],
  quickFilters: {
    immediate: boolean;
    free: boolean;
    veterans: boolean;
    families: boolean;
    nearMe: boolean;
  },
): Listing[] {
  // Guard against undefined inputs
  if (!listings) return [];
  if (!quickFilters) return listings;

  // If no filters are active, return all listings
  const activeFilters = Object.values(quickFilters).some(v => v);
  if (!activeFilters) {
    console.log("📝 No active filters, returning all listings");
    return listings;
  }

  let filtered = [...listings];

  if (quickFilters.immediate) {
    // Check if beds are available today
    filtered = filtered.filter((l) => l.availability.beds_today > 0);
  }

  if (quickFilters.free) {
    // Check if cost is free
    filtered = filtered.filter((l) => l.cost?.free === true);
  }

  if (quickFilters.veterans) {
    // Check if accepts veterans
    filtered = filtered.filter((l) => l.eligibility?.veterans === true);
  }

  if (quickFilters.families) {
    // Check if accepts families
    filtered = filtered.filter((l) =>
      l.eligibility?.family_status?.includes("family") === true
    );
  }

  if (quickFilters.nearMe) {
    // Filter by distance
    filtered = filtered.filter((l) => (l.distance || 0) < 2);
  }

  return filtered;
}