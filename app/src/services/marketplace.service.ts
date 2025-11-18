import { supabase } from "../lib/supabase";
import type { Listing as DBListing } from "../types/listing";
import { env } from "../utils/env";
import { getAllBlockedRelationships } from "./blockingService";

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
    website?: string;
    websiteUrls?: {
      primary: string;
      fallbacks: string[];
    } | null;
    hours?: string;
  };
  rating: number;
  reviewCount: number;
  lastUpdated: string;
  provider: string;
  verified: boolean;
  // NEW: Source tracking for affiliated vs external listings
  source: "hou2ed" | "google_places" | "osm";
  // NEW: External listing metadata
  externalMetadata?: {
    placeId?: string; // Google Place ID or OSM ID
    dataProvider?: string; // e.g., "Google Places", "OpenStreetMap"
    lastSynced?: string; // When data was fetched
    externalUrl?: string; // Link to external listing
  };
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns undefined if coordinates are invalid
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number | undefined {
  // Validate inputs - check for null, undefined, NaN, or invalid lat/lng values
  if (
    lat1 == null ||
    lon1 == null ||
    lat2 == null ||
    lon2 == null ||
    Number.isNaN(lat1) ||
    Number.isNaN(lon1) ||
    Number.isNaN(lat2) ||
    Number.isNaN(lon2) ||
    lat1 === 0 ||
    lon1 === 0 ||
    lat2 === 0 ||
    lon2 === 0 ||
    Math.abs(lat1) > 90 ||
    Math.abs(lat2) > 90 ||
    Math.abs(lon1) > 180 ||
    Math.abs(lon2) > 180
  ) {
    return undefined;
  }

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

  // Price info - stable logic prioritizing explicit free flag
  let monthlyPrice = 0;
  let isFree = false;

  if (dbListing.cost) {
    if (typeof dbListing.cost === "object") {
      // Normalize monthly to 0 if null/undefined for stability
      monthlyPrice = dbListing.cost.monthly ?? 0;

      // Prioritize explicit free flag, fall back to checking if monthly is 0
      if (dbListing.cost.free !== undefined && dbListing.cost.free !== null) {
        isFree = dbListing.cost.free === true;
      } else {
        isFree = monthlyPrice === 0;
      }
    } else if (typeof dbListing.cost === "number") {
      monthlyPrice = dbListing.cost;
      isFree = monthlyPrice === 0;
    }
  } else {
    // No cost info means it's free
    isFree = true;
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
    provider:
      dbListing.provider?.full_name ||
      dbListing.provider?.username ||
      "Provider",
    verified: dbListing.verified,
    source: (dbListing as any).source || "hou2ed", // Use actual source from DB, default to hou2ed for existing listings
  };
}

/**
 * Memoization cache for stable listing references
 * Prevents unnecessary re-renders by maintaining same object references
 */
const listingCache = new Map<string, MarketplaceListing>();

/**
 * Get a cached listing or create a new one if data changed
 * Ensures stable object references for React reconciliation
 */
function getCachedListing(
  id: string,
  dbListing: DBListing,
  userLat?: number,
  userLng?: number,
): MarketplaceListing {
  // Create cache key including location for distance-based caching
  const cacheKey = `${id}-${userLat?.toFixed(4) || "null"}-${userLng?.toFixed(4) || "null"}`;

  // Check if we have a cached version
  const cached = listingCache.get(cacheKey);
  if (cached) {
    // Transform fresh data to compare
    const fresh = transformToMarketplace(dbListing, userLat, userLng);

    // Deep equality check on critical fields that affect UI
    const isUnchanged =
      cached.name === fresh.name &&
      cached.availability === fresh.availability &&
      cached.bedsAvailable === fresh.bedsAvailable &&
      cached.price.isFree === fresh.price.isFree &&
      cached.price.min === fresh.price.min &&
      cached.distance === fresh.distance &&
      cached.verified === fresh.verified &&
      cached.coverImage === fresh.coverImage;

    if (isUnchanged) {
      // Data unchanged, return cached version with stable reference
      return cached;
    }
  }

  // Create new listing and cache it
  const listing = transformToMarketplace(dbListing, userLat, userLng);
  listingCache.set(cacheKey, listing);

  // Clear old cache entries to prevent memory leaks (keep last 500)
  if (listingCache.size > 500) {
    const keysToDelete = Array.from(listingCache.keys()).slice(0, 100);
    keysToDelete.forEach((key) => listingCache.delete(key));
  }

  return listing;
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
    console.log("   User location:", userLat, userLng);
    console.log("   Radius:", radiusMiles, "miles");

    // Use direct query with RLS policies (the RPC function doesn't exist)
    // The RLS policies allow anonymous users to view active listings
    let data: any[] | null = null;
    let error: any = null;

    console.log("   Fetching listings via direct query with RLS...");
    console.log("   Including provider info via join...");
    const queryPromise = supabase
      .from("listings")
      .select(
        `
        *,
        provider:profiles!listings_provider_id_fkey (
          id,
          full_name,
          username
        )
      `,
      )
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
    // Use getCachedListing to maintain stable object references
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

      // Use cached version to prevent unnecessary re-renders
      return getCachedListing(
        dbListing.id,
        dbListing as DBListing,
        userLat,
        userLng,
      );
    });

    console.log(`✅ Transformed ${listings.length} listings`);

    // Filter out blocked providers' listings
    const blockedUserIds = await getAllBlockedRelationships();
    if (blockedUserIds.length > 0) {
      const beforeBlock = listings.length;
      listings = listings.filter((listing) => {
        return !blockedUserIds.includes(listing.provider_id);
      });
      console.log(
        `🚫 Filtered out ${beforeBlock - listings.length} listings from blocked providers`,
      );
    }

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

    // Use cached version to maintain stable reference
    return getCachedListing((data as any).id, data as any, userLat, userLng);
  } catch (error) {
    console.error("Failed to fetch listing:", error);
    return null;
  }
}
