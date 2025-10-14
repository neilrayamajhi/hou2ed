import { supabase } from "../lib/supabase";

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
}

/**
 * Fetch all listings for a specific provider
 * This gets the listings from the database for the logged-in provider
 */
export async function getProviderListings(
  providerId: string
): Promise<ProviderListing[]> {
  try {
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
      `
      )
      .eq("provider_id", providerId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .abortSignal(AbortSignal.timeout(20000)); // 20 second timeout for this specific query

    if (error) {
      console.error("Error fetching provider listings:", error);
      // Provide more helpful error message
      if (error.message?.includes('aborted') || error.message?.includes('timeout')) {
        throw new Error("Request timed out. Please check your internet connection and try again.");
      }
      throw error;
    }

    // Transform the database format to our app format
    return (
      data?.map((listing) => {
        // Calculate total beds from unit_beds JSON
        const unitBeds = listing.unit_beds as Record<string, number> || {};
        const totalBeds = Object.values(unitBeds).reduce(
          (sum, count) => sum + count,
          0
        );

        // Get available beds from availability JSON
        const availability = listing.availability as {
          beds_today?: number;
          last_updated_at?: string;
        } || {};

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
    console.error("Failed to fetch provider listings:", error);
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
}> {
  const { data, error } = await supabase
    .from("listings")
    .select(`
      id,
      title,
      address,
      unit_beds,
      availability,
      images,
      cost,
      updated_at
    `)
    .eq("id", listingId)
    .single();

  if (error || !data) {
    throw error || new Error("Listing not found");
  }

  const unitBeds = (data.unit_beds as Record<string, number>) || {};
  const totalBeds = Object.values(unitBeds).reduce((sum, n) => sum + n, 0);
  const availability = (data.availability as any) || {};
  const price = (data.cost as any)?.monthly as number | undefined;

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
  };
}

/**
 * Create a new listing
 * This saves a new listing to the database
 */
export async function createListing(
  providerId: string,
  listingData: CreateListingInput
): Promise<{ success: boolean; listingId?: string; error?: string }> {
  try {
    // Prepare the data for Supabase
    const insertData = {
      provider_id: providerId,
      title: listingData.title,
      description: listingData.description || "",
      address: listingData.address,
      city: listingData.city || "Los Angeles",
      state: listingData.state || "CA",
      zip_code: listingData.zip_code || "90001",
      lat: 34.0522, // Default LA coordinates (would normally geocode the address)
      lng: -118.2437,
      housing_type: "emergency_shelter", // Default type
      unit_beds: {
        shared_dorm: listingData.totalBeds,
      },
      ada_beds: 0,
      gender_rooming: "co_ed",
      amenities: {},
      accessibility: {},
      eligibility: {},
      services: {},
      rules: {},
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

    const { data, error } = await supabase
      .from("listings")
      .insert(insertData)
      .select("id")
      .single();

    if (error) {
      console.error("Error creating listing:", error);
      return {
        success: false,
        error: error.message || "Failed to create listing",
      };
    }

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
  updates: UpdateListingInput
): Promise<{ success: boolean; error?: string }> {
  try {
    // Build the update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.title) updateData.title = updates.title;
    if (updates.address) updateData.address = updates.address;
    if (updates.description) updateData.description = updates.description;

    // Update unit_beds if totalBeds changed
    if (updates.totalBeds !== undefined) {
      updateData.unit_beds = {
        shared_dorm: updates.totalBeds,
      };
    }

    // Update availability if availableBeds or availabilityDays changed
    if (updates.availableBeds !== undefined || updates.availabilityDays !== undefined) {
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
        ...(updates.availableBeds !== undefined ? { beds_today: updates.availableBeds } : {}),
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
  listingId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("listings")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", listingId);

    if (error) {
      console.error("Error deleting listing:", error);
      return {
        success: false,
        error: error.message || "Failed to delete listing",
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete listing:", error);
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
