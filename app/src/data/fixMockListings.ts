/**
 * Fix mock listings to match the updated Listing type structure
 */

import type { Listing } from "../types/listing";

/**
 * Convert old mock listing format to new Listing type
 */
export function convertOldListingToNew(oldListing: any): Listing {
  // Guard against undefined input
  if (!oldListing) {
    throw new Error("Cannot convert undefined listing");
  }
  // Helper to generate realistic availability
  const generateAvailability = (status: string) => {
    const isAvailable = status === "available";
    const bedsToday = isAvailable ? Math.floor(Math.random() * 5) + 1 : 0;
    const bedsWeek = isAvailable ? Math.floor(Math.random() * 10) + 1 : 0;
    const waitlist = status === "waitlist" ? Math.floor(Math.random() * 20) + 1 : 0;

    return {
      beds_today: bedsToday,
      beds_week: bedsWeek,
      waitlist: waitlist,
      last_updated_at: new Date().toISOString()
    };
  };

  // Convert old format to new
  return {
    // Core fields
    id: oldListing.id,
    provider_id: oldListing.provider_id || `provider-${oldListing.id}`,
    title: oldListing.name || oldListing.title || "Unknown Listing",
    description: oldListing.description || "",

    // Address fields
    address: oldListing.address?.street || oldListing.location?.address || "Unknown Address",
    city: oldListing.address?.city || oldListing.location?.city || "San Francisco",
    state: oldListing.address?.state || oldListing.location?.state || "CA",
    zip_code: oldListing.address?.zipCode || oldListing.location?.zip || "94102",

    // Coordinates
    lat: oldListing.coordinates?.latitude || oldListing.location?.latitude || 37.7749,
    lng: oldListing.coordinates?.longitude || oldListing.location?.longitude || -122.4194,

    // Housing type
    housing_type: oldListing.type || oldListing.housing_type || "emergency_shelter",

    // Beds/Units
    unit_beds: {
      single_occupancy: oldListing.bedsAvailable || 0,
      double_occupancy: 0,
      family_unit: 0,
      dormitory: oldListing.totalBeds || 0,
      couples: 0
    },
    ada_beds: Math.floor((oldListing.totalBeds || 0) * 0.1),

    // Availability (convert string to object)
    availability: generateAvailability(oldListing.availability || "unknown"),

    // Cost (convert price to cost structure)
    cost: oldListing.price ? {
      monthly: oldListing.price.min || 0,
      deposit: 0,
      program_fee: 0,
      accepts: oldListing.price.acceptsVouchers ? ["voucher"] : [],
      sliding_scale: false,
      free: oldListing.price.isFree || false
    } : {
      monthly: 0,
      deposit: 0,
      program_fee: 0,
      accepts: [],
      sliding_scale: false,
      free: true
    },

    // Services (convert features to proper structure)
    services: oldListing.features ? {
      case_management: true,
      medical: [],
      mental_health: [],
      substance: [],
      employment: [],
      education: [],
      life_skills: [],
      transportation: []
    } : undefined,

    // Eligibility
    eligibility: oldListing.features ? {
      age_range: [18, 100],
      gender: [],
      family_status: oldListing.features.acceptsFamilies ? ["family"] : [],
      veterans: oldListing.features.acceptsVeterans || false,
      documentation: oldListing.requirements || [],
      background: [],
      substance: []
    } : undefined,

    // Other fields
    verified: oldListing.verified || oldListing.isVerified || false,
    certifications: [],
    images: oldListing.images || [oldListing.coverImage] || [],
    dv_sensitive: oldListing.isDVSensitive || false,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),

    // Optional fields
    distance: oldListing.distance,
    provider: oldListing.provider ? {
      id: oldListing.provider_id || `provider-${oldListing.id}`,
      full_name: oldListing.provider || oldListing.providerName || "Unknown Provider",
      username: oldListing.provider?.toLowerCase().replace(/\s+/g, '') || "unknown",
      is_verified: oldListing.verified || false
    } : undefined
  };
}

/**
 * Fix all mock listings to match the new type
 */
export function fixAllMockListings(listings: any[]): Listing[] {
  return listings.map(convertOldListingToNew);
}