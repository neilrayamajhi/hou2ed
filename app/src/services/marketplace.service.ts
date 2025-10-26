import { supabase } from "../lib/supabase";
import type { Listing as DBListing } from "../types/listing";

/**
 * HomeScreen's expected listing format (simplified from mock data)
 */
export interface MarketplaceListing {
  id: string;
  name: string;
  type: string;
  description: string;
  coverImage: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  distance?: number;
  price: {
    min: number;
    max: number;
    isFree: boolean;
    acceptsVouchers: boolean;
  };
  availability: "available" | "full" | "waitlist" | "unknown";
  bedsAvailable: number;
  totalBeds: number;
  amenities: string[];
  requirements: string[];
  features: {
    acceptsFamilies: boolean;
    acceptsVeterans: boolean;
    acceptsSingleMen: boolean;
    acceptsSingleWomen: boolean;
    petsAllowed: boolean;
    wheelchairAccessible: boolean;
    lgbtqFriendly: boolean;
  };
  contact: {
    phone?: string;
    email?: string;
    hours?: string;
  };
  rating: number;
  reviewCount: number;
  lastUpdated: string;
  provider: string;
  verified: boolean;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 3959; // Radius of Earth in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10; // Round to 1 decimal
}

/**
 * Transform database listing to marketplace format
 */
function transformToMarketplace(
  dbListing: DBListing,
  userLat?: number,
  userLng?: number,
): MarketplaceListing {
  // Calculate total beds from unit_beds
  const totalBeds = Object.values(dbListing.unit_beds || {}).reduce(
    (sum, count) => sum + (count || 0),
    0,
  );

  // Determine availability status
  const bedsAvailable = dbListing.availability?.beds_today || 0;
  let availability: "available" | "full" | "waitlist" | "unknown" = "unknown";
  if (bedsAvailable > 0) {
    availability = "available";
  } else if (
    dbListing.availability?.waitlist &&
    dbListing.availability.waitlist > 0
  ) {
    availability = "waitlist";
  } else {
    availability = "full";
  }

  // Calculate distance if user location provided
  const distance =
    userLat && userLng
      ? calculateDistance(userLat, userLng, dbListing.lat, dbListing.lng)
      : undefined;

  // Extract amenities from nested structure
  const amenities: string[] = [];
  if (dbListing.amenities) {
    Object.values(dbListing.amenities).forEach((category) => {
      if (Array.isArray(category)) {
        amenities.push(...category);
      }
    });
  }

  // Extract requirements from eligibility
  const requirements: string[] = [];
  if (dbListing.eligibility?.documentation) {
    requirements.push(...dbListing.eligibility.documentation);
  }
  if (dbListing.eligibility?.background) {
    requirements.push(...dbListing.eligibility.background);
  }

  // Determine gender/family features from gender_rooming and eligibility
  const isMale =
    dbListing.gender_rooming === "male" || dbListing.gender_rooming === "co_ed";
  const isFemale =
    dbListing.gender_rooming === "female" ||
    dbListing.gender_rooming === "co_ed";
  const acceptsFamilies =
    dbListing.gender_rooming === "family" ||
    dbListing.eligibility?.family_status?.includes("families") ||
    false;

  // Check for accessibility features
  const wheelchairAccessible = !!(
    dbListing.accessibility?.mobility &&
    dbListing.accessibility.mobility.length > 0
  );

  // Price info
  const monthlyPrice = dbListing.cost?.monthly || 0;
  const isFree = dbListing.cost?.free || monthlyPrice === 0;

  return {
    id: dbListing.id,
    name: dbListing.title,
    type: dbListing.housing_type || "shelter",
    description: dbListing.description || "Housing placement available.",
    coverImage: dbListing.images?.[0] || "https://via.placeholder.com/400x300",
    coordinates: {
      latitude: dbListing.lat,
      longitude: dbListing.lng,
    },
    address: {
      street: dbListing.address,
      city: dbListing.city,
      state: dbListing.state,
      zipCode: dbListing.zip_code,
    },
    distance,
    price: {
      min: monthlyPrice,
      max: monthlyPrice,
      isFree,
      acceptsVouchers: dbListing.cost?.accepts?.includes("vouchers") || false,
    },
    availability,
    bedsAvailable,
    totalBeds,
    amenities: amenities.slice(0, 5), // Top 5 amenities
    requirements: requirements.slice(0, 3), // Top 3 requirements
    features: {
      acceptsFamilies,
      acceptsVeterans: dbListing.eligibility?.veterans || false,
      acceptsSingleMen: isMale,
      acceptsSingleWomen: isFemale,
      petsAllowed: dbListing.rules?.pets === "allowed",
      wheelchairAccessible,
      lgbtqFriendly: true, // Default to true for inclusivity
    },
    contact: {
      phone: dbListing.provider?.provider_profile?.phone,
      email: dbListing.provider?.provider_profile?.email,
      hours: dbListing.intake?.hours || "24/7",
    },
    rating: 4.0, // Default rating (will add reviews later)
    reviewCount: 0,
    lastUpdated:
      dbListing.availability?.last_updated_at || dbListing.updated_at,
    provider: dbListing.provider?.full_name || "Housing Provider",
    verified: dbListing.verified,
  };
}

/**
 * Fetch all active listings from database for the seeker marketplace
 */
export async function getMarketplaceListings(
  userLat?: number,
  userLng?: number,
  radiusMiles: number = 50,
): Promise<MarketplaceListing[]> {
  try {
    console.log("🔵 START getMarketplaceListings");
    console.log("📋 Fetching marketplace listings...");

    const { data, error } = await supabase
      .from("listings")
      .select(
        `
        *,
        provider:profiles!listings_provider_id_fkey (
          id,
          full_name,
          provider_profile
        )
      `,
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(100); // Limit to 100 listings for performance

    console.log("🟢 Marketplace query completed. Error?", !!error, "Data count:", data?.length || 0);

    if (error) {
      console.error("❌ Error fetching marketplace listings:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      return [];
    }

    console.log(`✅ Found ${data?.length || 0} active listings`);

    // Transform to marketplace format
    let listings = (data || []).map((listing: any) =>
      transformToMarketplace(listing as DBListing, userLat, userLng),
    );

    // Filter by radius if user location provided
    if (userLat && userLng) {
      listings = listings.filter((listing) => {
        return !listing.distance || listing.distance <= radiusMiles;
      });
      console.log(`✅ ${listings.length} listings within ${radiusMiles} miles`);
    }

    // Sort by distance (closest first)
    return listings.sort((a, b) => (a.distance || 999) - (b.distance || 999));
  } catch (error) {
    console.error("Failed to fetch marketplace listings:", error);
    return [];
  }
}

/**
 * Get a single listing by ID (for detail view)
 */
export async function getMarketplaceListing(
  listingId: string,
  userLat?: number,
  userLng?: number,
): Promise<MarketplaceListing | null> {
  try {
    const { data, error } = await supabase
      .from("listings")
      .select(
        `
        *,
        provider:profiles!listings_provider_id_fkey (
          id,
          full_name,
          provider_profile
        )
      `,
      )
      .eq("id", listingId)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      console.error("Error fetching listing:", error);
      return null;
    }

    return transformToMarketplace(data as any, userLat, userLng);
  } catch (error) {
    console.error("Failed to fetch listing:", error);
    return null;
  }
}
