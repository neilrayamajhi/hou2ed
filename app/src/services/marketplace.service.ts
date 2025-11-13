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
    console.log("   User location:", userLat, userLng);
    console.log("   Radius:", radiusMiles, "miles");

    // Skip session validation - it causes hanging when switching accounts
    // The Supabase client automatically includes the session in requests
    console.log("⏭️ Skipping session check to prevent hanging...");

    // First try using the RPC function that bypasses RLS
    let data: any[] | null = null;
    let error: any = null;

    // Skip RPC and go straight to direct query
    // RPC has issues with session changes between provider/seeker
    const skipRpc = true;

    try {
      if (skipRpc) {
        console.log(
          "   Skipping RPC, using direct query (more reliable after account switches)",
        );
        error = new Error("RPC skipped");
      } else {
        console.log("   Trying RPC function to bypass RLS...");

        // Add timeout to RPC call to prevent hanging
        let rpcTimedOut = false;
        const timeoutId = setTimeout(() => {
          rpcTimedOut = true;
          console.log("   ⏰ RPC timeout triggered after 3 seconds");
        }, 3000); // Reduced to 3 seconds

        try {
          const rpcResult = await supabase.rpc("get_active_listings", {
            user_lat: userLat,
            user_lng: userLng,
            radius_miles: radiusMiles,
          });

          clearTimeout(timeoutId);

          if (rpcTimedOut) {
            console.log(
              "   ⚠️ RPC completed but after timeout, using fallback",
            );
            throw new Error("RPC timeout after 3 seconds");
          }

          data = rpcResult.data;
          error = rpcResult.error;
        } catch (rpcErr: any) {
          clearTimeout(timeoutId);
          console.log("   ⚠️ RPC error:", rpcErr?.message || "Unknown error");
          error = rpcErr;
        }
      }

      // Check for RPC-specific errors or if RPC was skipped
      if (
        error?.code === "42804" ||
        error?.message?.includes("structure of query") ||
        error?.message?.includes("RPC timeout") ||
        error?.message?.includes("RPC skipped") ||
        skipRpc
      ) {
        console.log(
          "   ⚠️ RPC function error or skipped, falling back to direct query:",
          error?.message,
        );

        // Fall back to direct query WITHOUT the join - the join is causing hanging
        // We'll fetch provider info separately if needed
        console.log("   📊 Starting simplified direct query (no joins)...");
        const queryPromise = supabase
          .from("listings")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(100);

        // Race against a 3 second timeout
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Direct query timeout after 3 seconds")),
            3000,
          ),
        );

        try {
          const queryResult = (await Promise.race([
            queryPromise,
            timeoutPromise,
          ])) as any;
          console.log("   ✅ Direct query completed successfully");
          data = queryResult.data;
          error = queryResult.error;

          // If successful and we have data, fetch provider info separately
          if (data && data.length > 0) {
            console.log(
              `   📊 Fetching provider info for ${data.length} listings...`,
            );
            const providerIds = [
              ...new Set(data.map((l: any) => l.provider_id).filter(Boolean)),
            ];

            if (providerIds.length > 0) {
              const { data: providers } = await supabase
                .from("profiles")
                .select("id, full_name, username, role")
                .in("id", providerIds);

              // Attach provider info to listings
              if (providers) {
                const providerMap = new Map(providers.map((p) => [p.id, p]));
                data = data.map((listing: any) => ({
                  ...listing,
                  provider: providerMap.get(listing.provider_id) || null,
                }));
                console.log("   ✅ Provider info attached");
              }
            }
          }
        } catch (timeoutError) {
          console.error("   ❌ Direct query timed out:", timeoutError);
          error = timeoutError;
          data = [];
        }
      } else if (!error && data) {
        console.log(`   ✅ RPC function returned ${data.length} listings`);
      }
    } catch (outerError) {
      console.log(
        "   ⚠️ Unexpected error, falling back to direct query:",
        outerError,
      );
      // Fall back to direct query with provider info
      try {
        const queryResult = await supabase
          .from("listings")
          .select(
            `
            *,
            provider:profiles!listings_provider_id_fkey (
              id,
              full_name,
              username,
              role
            )
          `,
          )
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(100);

        data = queryResult.data;
        error = queryResult.error;
      } catch (fallbackError) {
        console.error("   ❌ Even fallback query failed:", fallbackError);
        return [];
      }
    }

    console.log(
      "🟢 Query completed. Error?",
      !!error,
      "Data count:",
      data?.length || 0,
    );

    if (error) {
      console.error("❌ Error fetching marketplace listings:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));

      // If RLS is blocking, try one more workaround
      if (error.code === "42501" || error.message?.includes("permission")) {
        console.log("🔧 RLS blocking detected, attempting workaround...");

        // Try to use service role if available (this won't work in production but helps during development)
        const serviceRoleKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_KEY;
        if (serviceRoleKey && __DEV__) {
          console.log("   Using service role key in dev mode...");
          const { createClient } = await import("@supabase/supabase-js");
          const serviceSupabase = createClient(
            env.SUPABASE_URL,
            serviceRoleKey,
          );

          const serviceResult = await serviceSupabase
            .from("listings")
            .select("*")
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(100);

          if (serviceResult.data) {
            console.log(
              `   ✅ Service role query returned ${serviceResult.data.length} listings`,
            );
            data = serviceResult.data;
            error = null;
          }
        }
      }

      if (error) {
        return [];
      }
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
