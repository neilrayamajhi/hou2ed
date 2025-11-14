import { supabase } from "../lib/supabase";
import { geocodeAddress } from "../lib/geocoding";

// Type for a simplified listing (what providers see in dashboard)
export interface ProviderListing {
  id: string;
  title: string;
  address: string;
  totalBeds: number;
  availableBeds: number;
  lastUpdated: string;
  image?: string;
}

// Type for creating a new listing
export interface CreateListingInput {
  title: string;
  address: string;
  city?: string;
  state?: string;
  zip_code?: string;
  totalBeds: number;
  availableBeds?: number;
  price?: number;
  description?: string;
  // Optional: Pre-geocoded coordinates (skips geocoding if provided)
  coordinates?: {
    lat: number;
    lng: number;
  };
  // New fields for amenities, services, rules, eligibility
  amenities?: string[];
  customAmenities?: string[];
  services?: string[];
  customServices?: string[];
  curfew?: string;
  visitorsPolicy?: string;
  petsPolicy?: "allowed" | "not_allowed" | "service_only";
  customRules?: string[];
  minAge?: number;
  maxAge?: number;
  eligibility?: string[];
  customEligibility?: string[];
}

// Type for updating a listing
export interface UpdateListingInput {
  title?: string;
  address?: string;
  totalBeds?: number;
  availableBeds?: number;
  price?: number;
  description?: string;
  images?: string[];
  availabilityDays?: Record<string, number>; // YYYY-MM-DD -> beds
  // Amenities, services, rules, eligibility
  amenities?: string[];
  customAmenities?: string[];
  services?: string[];
  customServices?: string[];
  curfew?: string;
  visitorsPolicy?: string;
  petsPolicy?: "allowed" | "not_allowed" | "service_only";
  customRules?: string[];
  minAge?: number;
  maxAge?: number;
  eligibility?: string[];
  customEligibility?: string[];
}

/**
 * Fetch all listings for a specific provider
 * This gets the listings from the database for the logged-in provider
 */
export async function getProviderListings(
  providerId: string,
): Promise<ProviderListing[]> {
  console.log("🔵 START getProviderListings for:", providerId);
  try {
    console.log("📋 Fetching listings for provider:", providerId);

    // Skip manual auth check - RLS policies will handle authentication
    // The getUser() call was hanging after account switches, causing issues
    // RLS will return empty results if user isn't authenticated or doesn't own the listings

    console.log("📡 Executing Supabase query...");
    const startTime = Date.now();

    const { data, error } = await supabase
      .from("listings")
      .select(
        `
        id,
        title,
        address,
        unit_beds,
        availability,
        updated_at,
        images
      `,
      )
      .eq("provider_id", providerId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    const queryTime = Date.now() - startTime;
    console.log(`⏱️ Query completed in ${queryTime}ms`);

    console.log(
      "🟢 Query completed. Error?",
      !!error,
      "Data count:",
      data?.length || 0,
    );

    if (error) {
      console.error("❌ Error fetching provider listings:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      throw error;
    }

    console.log(
      `✅ Found ${data?.length || 0} listings for provider ${providerId}`,
    );
    console.log("Raw listing data:", data);

    // Transform the database format to our app format
    return (
      data?.map((listing) => {
        // Calculate total beds from unit_beds JSON
        const unitBeds = (listing.unit_beds as Record<string, number>) || {};
        const totalBeds = Object.values(unitBeds).reduce(
          (sum, count) => sum + count,
          0,
        );

        // Get available beds from availability JSON
        const availability =
          (listing.availability as {
            beds_today?: number;
            last_updated_at?: string;
          }) || {};

        return {
          id: listing.id,
          title: listing.title,
          address: listing.address,
          totalBeds,
          availableBeds: availability.beds_today || 0,
          lastUpdated: availability.last_updated_at || listing.updated_at,
          image: Array.isArray(listing.images) ? listing.images[0] : undefined,
        };
      }) || []
    );
  } catch (error) {
    console.error("❌ CRITICAL: Failed to fetch provider listings:", error);
    console.error(
      "Returning empty array - this will cause UI to show 'no listings'",
    );
    return [];
  }
}

/** Fetch a single listing with full details */
export async function getListingById(listingId: string): Promise<{
  id: string;
  title: string;
  address: string;
  totalBeds: number;
  availableBeds: number;
  lastUpdated: string;
  images: string[];
  price?: number;
  availabilityDays?: Record<string, number>;
  amenities?: string[];
  services?: string[];
  curfew?: string;
  visitorsPolicy?: string;
  petsPolicy?: "allowed" | "not_allowed" | "service_only";
  minAge?: number;
  maxAge?: number;
  eligibility?: string[];
}> {
  const { data, error } = await supabase
    .from("listings")
    .select(
      `
      id,
      title,
      address,
      unit_beds,
      availability,
      images,
      cost,
      updated_at,
      amenities,
      services,
      rules,
      eligibility
    `,
    )
    .eq("id", listingId)
    .single();

  if (error || !data) {
    throw error || new Error("Listing not found");
  }

  const unitBeds = (data.unit_beds as Record<string, number>) || {};
  const totalBeds = Object.values(unitBeds).reduce((sum, n) => sum + n, 0);
  const availability = (data.availability as any) || {};
  const price = (data.cost as any)?.monthly as number | undefined;

  // Parse amenities from database format
  const amenitiesObj = (data.amenities as any) || {};
  const amenities = amenitiesObj.basic || [];

  // Parse services from database format (reverse of createListing mapping)
  const servicesObj = (data.services as any) || {};
  const services: string[] = [];
  if (servicesObj.case_management) services.push("case_management");
  if (servicesObj.medical) services.push("medical");
  if (servicesObj.mental_health) services.push("mental_health");
  if (servicesObj.substance) services.push("substance_abuse");
  if (servicesObj.employment) services.push("job_training");
  if (servicesObj.education) services.push("education");
  if (servicesObj.transportation) services.push("transportation");
  if (servicesObj.legal) services.push("legal");

  // Parse rules from database format
  const rulesObj = (data.rules as any) || {};
  const curfew = rulesObj.curfew || "";
  const visitorsPolicy = rulesObj.visitors || "";
  const petsPolicy = rulesObj.pets || "not_allowed";

  // Parse eligibility from database format (reverse of createListing mapping)
  const eligibilityObj = (data.eligibility as any) || {};
  const eligibility: string[] = [];
  const minAge = eligibilityObj.age_range?.[0];
  const maxAge = eligibilityObj.age_range?.[1];

  if (eligibilityObj.gender) {
    if (eligibilityObj.gender.includes("male")) eligibility.push("men_only");
    if (eligibilityObj.gender.includes("female"))
      eligibility.push("women_only");
    if (eligibilityObj.gender.includes("all")) eligibility.push("all_genders");
  }
  if (eligibilityObj.family_status?.includes("families")) {
    eligibility.push("families");
  }
  if (eligibilityObj.veterans) {
    eligibility.push("veterans");
  }

  return {
    id: data.id,
    title: data.title,
    address: data.address,
    totalBeds,
    availableBeds: availability.beds_today || 0,
    lastUpdated: availability.last_updated_at || data.updated_at,
    images: Array.isArray(data.images) ? (data.images as string[]) : [],
    price,
    availabilityDays: availability.days || {},
    amenities,
    services,
    curfew,
    visitorsPolicy,
    petsPolicy,
    minAge,
    maxAge,
    eligibility,
  };
}

/**
 * Create a new listing
 * This saves a new listing to the database
 */
export async function createListing(
  providerId: string,
  listingData: CreateListingInput,
): Promise<{ success: boolean; listingId?: string; error?: string }> {
  try {
    // Build amenities object from array
    const amenitiesObj: any = {};
    if (listingData.amenities && listingData.amenities.length > 0) {
      amenitiesObj.basic = listingData.amenities;
    }
    if (listingData.customAmenities && listingData.customAmenities.length > 0) {
      amenitiesObj.custom = listingData.customAmenities;
    }

    // Build services object from array
    const servicesObj: any = {};
    if (listingData.services && listingData.services.length > 0) {
      if (listingData.services.includes("case_management"))
        servicesObj.case_management = true;
      if (listingData.services.includes("medical"))
        servicesObj.medical = ["general_medical"];
      if (listingData.services.includes("mental_health"))
        servicesObj.mental_health = ["counseling"];
      if (listingData.services.includes("substance_abuse"))
        servicesObj.substance = ["treatment"];
      if (listingData.services.includes("job_training"))
        servicesObj.employment = ["job_training"];
      if (listingData.services.includes("education"))
        servicesObj.education = ["ged_prep"];
      if (listingData.services.includes("transportation"))
        servicesObj.transportation = ["assistance"];
      if (listingData.services.includes("legal")) servicesObj.legal = true;
    }
    if (listingData.customServices && listingData.customServices.length > 0) {
      servicesObj.custom = listingData.customServices;
    }

    // Build rules object
    const rulesObj: any = {};
    if (listingData.curfew) rulesObj.curfew = listingData.curfew;
    if (listingData.visitorsPolicy)
      rulesObj.visitors = listingData.visitorsPolicy;
    if (listingData.petsPolicy) rulesObj.pets = listingData.petsPolicy;
    if (listingData.customRules && listingData.customRules.length > 0) {
      rulesObj.custom = listingData.customRules;
    }

    // Build eligibility object
    const eligibilityObj: any = {};
    if (listingData.minAge !== undefined || listingData.maxAge !== undefined) {
      eligibilityObj.age_range = [
        listingData.minAge || 18,
        listingData.maxAge || 999,
      ];
    }
    if (listingData.eligibility && listingData.eligibility.length > 0) {
      const genderOptions = [];
      if (listingData.eligibility.includes("men_only"))
        genderOptions.push("male");
      if (listingData.eligibility.includes("women_only"))
        genderOptions.push("female");
      if (listingData.eligibility.includes("all_genders"))
        genderOptions.push("all");
      if (genderOptions.length > 0) eligibilityObj.gender = genderOptions;

      if (listingData.eligibility.includes("families")) {
        eligibilityObj.family_status = ["families"];
      }
      if (listingData.eligibility.includes("veterans")) {
        eligibilityObj.veterans = true;
      }
    }
    if (
      listingData.customEligibility &&
      listingData.customEligibility.length > 0
    ) {
      eligibilityObj.custom = listingData.customEligibility;
    }

    // Use provided coordinates or geocode the address
    let lat: number;
    let lng: number;

    if (listingData.coordinates) {
      // Coordinates provided from autocomplete - no need to geocode!
      lat = listingData.coordinates.lat;
      lng = listingData.coordinates.lng;
      console.log("✅ Using pre-geocoded coordinates:", { lat, lng });
    } else {
      // No coordinates provided, geocode the address
      lat = 34.0522; // Default LA coordinates as fallback
      lng = -118.2437;

      const geocodeResult = await geocodeAddress({
        street: listingData.address,
        city: listingData.city || null,
        state: listingData.state || null,
        zip: listingData.zip_code || null,
      });

      if (geocodeResult) {
        lat = geocodeResult.lat;
        lng = geocodeResult.lng;
        console.log("✅ Geocoded address:", {
          address: listingData.address,
          lat,
          lng,
        });
      } else {
        console.warn("⚠️ Geocoding failed, using default LA coordinates");
      }
    }

    // Prepare the data for Supabase
    const insertData = {
      provider_id: providerId,
      title: listingData.title,
      description: listingData.description || "",
      address: listingData.address,
      city: listingData.city || "Los Angeles",
      state: listingData.state || "CA",
      zip_code: listingData.zip_code || "90001",
      lat,
      lng,
      housing_type: "emergency_shelter", // Default type
      unit_beds: {
        shared_dorm: listingData.totalBeds,
      },
      ada_beds: 0,
      gender_rooming: "co_ed",
      amenities: amenitiesObj,
      accessibility: {},
      eligibility: eligibilityObj,
      services: servicesObj,
      rules: rulesObj,
      cost: listingData.price
        ? { monthly: listingData.price }
        : { is_free: true },
      intake: {},
      availability: {
        beds_today: listingData.availableBeds || listingData.totalBeds,
        beds_week: listingData.totalBeds,
        waitlist: 0,
        last_updated_at: new Date().toISOString(),
      },
      verified: false,
      dv_sensitive: false,
      is_active: true,
    };

    console.log("Creating listing with data:", {
      title: insertData.title,
      address: insertData.address,
      totalBeds: insertData.unit_beds,
      provider_id: insertData.provider_id,
    });

    const { data, error } = await supabase
      .from("listings")
      .insert(insertData)
      .select("id")
      .single();

    if (error) {
      console.error("Error creating listing:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      return {
        success: false,
        error: error.message || "Failed to create listing",
      };
    }

    console.log("✅ Listing created successfully:", {
      listingId: data.id,
      title: insertData.title,
    });

    return {
      success: true,
      listingId: data.id,
    };
  } catch (error: any) {
    console.error("Failed to create listing:", error);
    return {
      success: false,
      error: error.message || "An unexpected error occurred",
    };
  }
}

/**
 * Update an existing listing
 * This updates a listing in the database
 */
export async function updateListing(
  listingId: string,
  updates: UpdateListingInput,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Build the update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.title) updateData.title = updates.title;
    if (updates.description) updateData.description = updates.description;

    // If address changes, re-geocode to get new coordinates
    if (updates.address) {
      updateData.address = updates.address;

      // Get current listing data for city, state, zip if not in updates
      const { data: currentListing } = await supabase
        .from("listings")
        .select("city, state, zip_code")
        .eq("id", listingId)
        .single();

      const geocodeResult = await geocodeAddress({
        street: updates.address,
        city: currentListing?.city || null,
        state: currentListing?.state || null,
        zip: currentListing?.zip_code || null,
      });

      if (geocodeResult) {
        updateData.lat = geocodeResult.lat;
        updateData.lng = geocodeResult.lng;
        console.log("✅ Re-geocoded address:", {
          address: updates.address,
          lat: geocodeResult.lat,
          lng: geocodeResult.lng,
        });
      } else {
        console.warn("⚠️ Geocoding failed, coordinates not updated");
      }
    }

    // Update unit_beds if totalBeds changed
    if (updates.totalBeds !== undefined) {
      updateData.unit_beds = {
        shared_dorm: updates.totalBeds,
      };
    }

    // Update availability if availableBeds or availabilityDays changed
    if (
      updates.availableBeds !== undefined ||
      updates.availabilityDays !== undefined
    ) {
      // First, get the current availability
      const { data: currentListing } = await supabase
        .from("listings")
        .select("availability")
        .eq("id", listingId)
        .single();

      const currentAvailability = (currentListing?.availability as any) || {};

      const mergedDays = {
        ...(currentAvailability.days || {}),
        ...(updates.availabilityDays || {}),
      };

      updateData.availability = {
        ...currentAvailability,
        ...(updates.availableBeds !== undefined
          ? { beds_today: updates.availableBeds }
          : {}),
        ...(Object.keys(mergedDays).length ? { days: mergedDays } : {}),
        last_updated_at: new Date().toISOString(),
      };
    }

    // Update images if provided
    if (updates.images !== undefined) {
      updateData.images = updates.images;
    }

    // Update cost if price changed
    if (updates.price !== undefined) {
      updateData.cost =
        updates.price > 0 ? { monthly: updates.price } : { is_free: true };
    }

    // Update amenities if provided
    if (updates.amenities !== undefined) {
      updateData.amenities =
        updates.amenities.length > 0 ? { basic: updates.amenities } : {};
    }

    // Update services if provided
    if (updates.services !== undefined) {
      const servicesObj: any = {};
      if (updates.services.includes("case_management"))
        servicesObj.case_management = true;
      if (updates.services.includes("medical"))
        servicesObj.medical = ["general_medical"];
      if (updates.services.includes("mental_health"))
        servicesObj.mental_health = ["counseling"];
      if (updates.services.includes("substance_abuse"))
        servicesObj.substance = ["treatment"];
      if (updates.services.includes("job_training"))
        servicesObj.employment = ["job_training"];
      if (updates.services.includes("education"))
        servicesObj.education = ["ged_prep"];
      if (updates.services.includes("transportation"))
        servicesObj.transportation = ["assistance"];
      if (updates.services.includes("legal")) servicesObj.legal = true;
      updateData.services = servicesObj;
    }

    // Update rules if provided
    if (
      updates.curfew !== undefined ||
      updates.visitorsPolicy !== undefined ||
      updates.petsPolicy !== undefined
    ) {
      const rulesObj: any = {};
      if (updates.curfew) rulesObj.curfew = updates.curfew;
      if (updates.visitorsPolicy) rulesObj.visitors = updates.visitorsPolicy;
      if (updates.petsPolicy) rulesObj.pets = updates.petsPolicy;
      updateData.rules = rulesObj;
    }

    // Update eligibility if provided
    if (
      updates.minAge !== undefined ||
      updates.maxAge !== undefined ||
      updates.eligibility !== undefined
    ) {
      const eligibilityObj: any = {};
      if (updates.minAge !== undefined || updates.maxAge !== undefined) {
        eligibilityObj.age_range = [
          updates.minAge || 18,
          updates.maxAge || 999,
        ];
      }
      if (updates.eligibility && updates.eligibility.length > 0) {
        const genderOptions = [];
        if (updates.eligibility.includes("men_only"))
          genderOptions.push("male");
        if (updates.eligibility.includes("women_only"))
          genderOptions.push("female");
        if (updates.eligibility.includes("all_genders"))
          genderOptions.push("all");
        if (genderOptions.length > 0) eligibilityObj.gender = genderOptions;

        if (updates.eligibility.includes("families")) {
          eligibilityObj.family_status = ["families"];
        }
        if (updates.eligibility.includes("veterans")) {
          eligibilityObj.veterans = true;
        }
      }
      updateData.eligibility = eligibilityObj;
    }

    const { error } = await supabase
      .from("listings")
      .update(updateData)
      .eq("id", listingId);

    if (error) {
      console.error("Error updating listing:", error);
      return {
        success: false,
        error: error.message || "Failed to update listing",
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Failed to update listing:", error);
    return {
      success: false,
      error: error.message || "An unexpected error occurred",
    };
  }
}

/**
 * Delete a listing (soft delete by setting is_active to false)
 * This marks a listing as inactive in the database
 */
export async function deleteListing(
  listingId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("🗑️ Attempting to delete (soft) listing:", listingId);

    // First, verify the user owns this listing
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error("❌ No authenticated user");
      return {
        success: false,
        error: "You must be logged in to delete a listing",
      };
    }

    // Verify ownership before attempting delete
    const { data: listing, error: fetchError } = await supabase
      .from("listings")
      .select("provider_id, title")
      .eq("id", listingId)
      .single();

    if (fetchError || !listing) {
      console.error("❌ Listing not found:", fetchError);
      return {
        success: false,
        error: "Listing not found",
      };
    }

    if (listing.provider_id !== user.id) {
      console.error("❌ User does not own this listing");
      return {
        success: false,
        error: "You can only delete your own listings",
      };
    }

    console.log("✅ Verified ownership, proceeding with delete");

    // Now perform the soft delete
    // IMPORTANT: We only update is_active and updated_at
    // We do NOT change provider_id or any other fields that might trigger RLS
    const { error, data } = await supabase
      .from("listings")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", listingId)
      .eq("provider_id", user.id) // Extra safety check
      .select(); // Return the updated row for debugging

    console.log("Update result:", { error, data });

    if (error) {
      console.error("❌ Error deleting listing:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });

      // Provide user-friendly error message
      if (error.code === "42501") {
        return {
          success: false,
          error:
            "Permission denied. Please make sure you have the right to delete this listing.",
        };
      }

      return {
        success: false,
        error: `Failed to delete: ${error.message}`,
      };
    }

    console.log("✅ Listing soft-deleted successfully:", listingId);
    return { success: true };
  } catch (error: any) {
    console.error("❌ Failed to delete listing:", error);
    return {
      success: false,
      error: error.message || "An unexpected error occurred",
    };
  }
}

/**
 * Get the current user's provider ID
 * Helper function to get the logged-in user's ID
 */
export async function getCurrentProviderId(): Promise<string | null> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      console.error("Error getting current user:", error);
      return null;
    }

    return user.id;
  } catch (error) {
    console.error("Failed to get current provider ID:", error);
    return null;
  }
}
