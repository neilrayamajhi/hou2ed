import { supabase } from "../lib/supabase";
import type { Listing as DBListing } from "../types/listing";
import { env } from "../utils/env";

/**
 * HomeScreen's expected listing format (simplified from mock data)
 */
export interface MarketplaceListing {
  id: string;
  provider_id: string; // Added provider_id for messaging functionality
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
  requiredDocuments: string[];
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
  // Normalize images to public URLs (handles paths/objects/strings)
  const toArray = (v: any) => (Array.isArray(v) ? v : v ? [v] : []);
  const toString = (v: any) => {
    if (v == null) return null;
    if (typeof v === "string") return v.trim();
    if (typeof v === "object" && (v as any).url)
      return String((v as any).url).trim();
    try {
      return String(v).trim();
    } catch {
      return null;
    }
  };
  const toPublicUrl = (p: string | null) => {
    if (!p) return null;
    if (/^https?:\/\//i.test(p)) return p;
    const { data } = supabase.storage.from("listing-images").getPublicUrl(p);
    return data?.publicUrl || p;
  };
  const imageUrls = toArray((dbListing as any).images)
    .map(toString)
    .filter(Boolean)
    .map((s) => toPublicUrl(s as string))
    .filter((u): u is string => !!u && /^https?:\/\//i.test(u));
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

  // Extract required documents from intake
  const requiredDocuments: string[] = [];
  if (
    dbListing.intake?.required_documents &&
    Array.isArray(dbListing.intake.required_documents)
  ) {
    requiredDocuments.push(...dbListing.intake.required_documents);
  }

  // Extract eligibility from database (wizard converts to structured object)
  // Wizard: ["women_only"] → DB: {gender: ["female"]}
  // Wizard: ["men_only"] → DB: {gender: ["male"]}
  // Wizard: ["all_genders"] → DB: {gender: ["all"]}
  const genderEligibility = dbListing.eligibility?.gender || [];
  const acceptsMen =
    genderEligibility.includes("male") || genderEligibility.includes("all");
  const acceptsWomen =
    genderEligibility.includes("female") || genderEligibility.includes("all");
  const acceptsFamilies =
    dbListing.eligibility?.family_status?.includes("families") || false;
  const acceptsVeterans = dbListing.eligibility?.veterans || false;

  // Check for accessibility features
  const wheelchairAccessible = !!(
    dbListing.accessibility?.mobility &&
    dbListing.accessibility.mobility.length > 0
  );

  // Price info - handle both old and new cost structures
  let monthlyPrice = 0;
  let isFree = false;

  if (dbListing.cost) {
    if (typeof dbListing.cost === "object") {
      monthlyPrice = dbListing.cost.monthly || 0;
      isFree = dbListing.cost.free === true || dbListing.cost.is_free === true;
    } else if (typeof dbListing.cost === "number") {
      monthlyPrice = dbListing.cost;
      isFree = monthlyPrice === 0;
    }
  }

  return {
    id: dbListing.id,
    provider_id: dbListing.provider_id || dbListing.id, // Use listing id as fallback if no provider_id
    name: dbListing.title,
    type: dbListing.housing_type || "shelter",
    description: dbListing.description || "Housing placement available.",
    coverImage: imageUrls[0] || "https://via.placeholder.com/400x300",
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
    requiredDocuments,
    features: {
      acceptsFamilies,
      acceptsVeterans,
      acceptsSingleMen: acceptsMen,
      acceptsSingleWomen: acceptsWomen,
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
    provider:
      dbListing.provider?.full_name ||
      dbListing.provider?.username ||
      "Provider",
    verified: dbListing.verified,
  };
}

/**
 * Apply filters to listings
 */
function applyFilters(
  listings: MarketplaceListing[],
  filters: any,
): MarketplaceListing[] {
  return listings.filter((listing) => {
    // Amenities filters - match ListingWizard amenities exactly
    if (filters.amenities) {
      const activeAmenities = Object.keys(filters.amenities).filter(
        (k) => filters.amenities[k],
      );
      for (const amenity of activeAmenities) {
        const found = listing.amenities.some(
          (a) =>
            a.toLowerCase().includes(amenity.toLowerCase()) ||
            a.toLowerCase().replace(/[_\s]/g, "") ===
              amenity.toLowerCase().replace(/[_\s]/g, ""),
        );
        if (!found) return false;
      }
    }

    // Services filters - match ListingWizard services
    if (filters.supportPrograms) {
      const activeServices = Object.keys(filters.supportPrograms).filter(
        (k) => filters.supportPrograms[k],
      );
      for (const service of activeServices) {
        const found =
          listing.amenities.some((a) =>
            a.toLowerCase().includes(service.toLowerCase()),
          ) ||
          listing.requirements.some((r) =>
            r.toLowerCase().includes(service.toLowerCase()),
          );
        if (!found) return false;
      }
    }

    // Eligibility filters - match ListingWizard eligibility options
    if (filters.eligibility) {
      if (filters.eligibility.veterans && !listing.features.acceptsVeterans)
        return false;
      if (filters.eligibility.families && !listing.features.acceptsFamilies)
        return false;
      if (filters.eligibility.men_only && !listing.features.acceptsSingleMen)
        return false;
      if (
        filters.eligibility.women_only &&
        !listing.features.acceptsSingleWomen
      )
        return false;
    }

    // Pets policy filter - match ListingWizard petsPolicy
    if (filters.rulesRequirements) {
      if (
        filters.rulesRequirements.pets_allowed &&
        !listing.features.petsAllowed
      )
        return false;
    }

    // Cost filters - match ListingWizard pricing
    if (filters.costPayment) {
      if (filters.costPayment.free && !listing.price.isFree) return false;
      if (filters.costPayment.under500 && listing.price.min >= 500)
        return false;
      if (filters.costPayment.under1000 && listing.price.min >= 1000)
        return false;
    }

    // Availability filter - beds available today
    if (filters.availabilityIntake) {
      if (
        filters.availabilityIntake.available_now &&
        listing.bedsAvailable <= 0
      )
        return false;
    }

    // Price range filter
    if (filters.priceRange) {
      if (
        listing.price.min < filters.priceRange.min ||
        listing.price.min > filters.priceRange.max
      ) {
        return false;
      }
    }

    // Location filter (city or zipCode)
    if (filters.location) {
      if (
        filters.location.city &&
        !listing.address.city
          ?.toLowerCase()
          .includes(filters.location.city.toLowerCase())
      ) {
        return false;
      }
      if (
        filters.location.zipCode &&
        listing.address.zipCode !== filters.location.zipCode
      ) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Fetch all active listings from database for the seeker marketplace
 */
export async function getMarketplaceListings(
  userLat?: number,
  userLng?: number,
  radiusMiles: number = 50,
  filters?: any,
): Promise<MarketplaceListing[]> {
  try {
    console.log("🔵 START getMarketplaceListings");
    console.log("📋 Fetching marketplace listings...");
    console.log("   User location:", userLat, userLng);
    console.log("   Radius:", radiusMiles, "miles");

    // Use direct query with RLS policies (the RPC function doesn't exist)
    // The RLS policies allow anonymous users to view active listings
    let data: any[] | null = null;
    let error: any = null;

    console.log("   Fetching listings via direct query with RLS...");
    console.log("   Using simplified query without joins...");
    const queryPromise = supabase
      .from("listings")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(100);

    const timeoutPromise = new Promise<{ data: null; error: any }>((resolve) =>
      setTimeout(() => {
        console.warn("⚠️ Query timeout after 10 seconds");
        resolve({
          data: null,
          error: { message: "Query timeout", code: "TIMEOUT" },
        });
      }, 10000),
    );

    const queryResult = await Promise.race([queryPromise, timeoutPromise]);

    data = queryResult.data;
    error = queryResult.error;

    console.log(
      "🟢 Query completed. Error?",
      !!error,
      "Data count:",
      data?.length || 0,
    );

    if (error) {
      console.error("❌ Error fetching marketplace listings:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      return [];
    }

    if (!data || data.length === 0) {
      console.log("⚠️ No active listings found in database");
      return [];
    }

    console.log(`✅ Found ${data.length} active listings`);
    console.log("   First listing:", data[0]?.title, data[0]?.id);

    // Transform to marketplace format with actual provider info
    let listings = data.map((listing: any) => {
      const dbListing = listing as any;

      // Log the provider info to debug
      console.log(
        `Listing ${dbListing.title} has provider:`,
        dbListing.provider?.full_name || "Unknown",
        "with ID:",
        dbListing.provider_id,
      );

      // If provider info wasn't included in the query, use a fallback
      if (!dbListing.provider) {
        dbListing.provider = {
          id: dbListing.provider_id,
          full_name: "Provider",
          username: null,
          role: "provider",
        };
      }

      return transformToMarketplace(dbListing as DBListing, userLat, userLng);
    });

    console.log(`✅ Transformed ${listings.length} listings`);

    // Filter by radius if user location provided
    if (userLat && userLng) {
      const beforeFilter = listings.length;
      listings = listings.filter((listing) => {
        return !listing.distance || listing.distance <= radiusMiles;
      });
      console.log(
        `✅ Filtered from ${beforeFilter} to ${listings.length} listings within ${radiusMiles} miles`,
      );
    }

    // Apply filters if provided
    if (filters) {
      const beforeFilter = listings.length;
      listings = applyFilters(listings, filters);
      console.log(
        `✅ Applied filters: ${beforeFilter} -> ${listings.length} listings`,
      );
    }

    // Sort by distance (closest first) or by last updated if no location
    return listings.sort((a, b) => {
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }
      // Fallback to sorting by last updated
      return (
        new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
      );
    });
  } catch (error) {
    console.error("❌ Failed to fetch marketplace listings:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack",
    );
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
