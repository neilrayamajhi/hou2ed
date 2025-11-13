import { supabase } from "../lib/supabase";
import type { SearchFilters, Listing } from "../types/listing";

// Type definitions
export interface SavedListing {
  id: string;
  user_id: string;
  listing_id: string;
  listing?: Listing;
  notes?: string;
  created_at: string;
}

export interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  filters: SearchFilters;
  notification_enabled: boolean;
  notification_frequency?: "instant" | "daily" | "weekly";
  last_notified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SavedSearchAlert {
  id: string;
  saved_search_id: string;
  listing_id: string;
  seen: boolean;
  created_at: string;
}

export interface SaveListingParams {
  listingId: string;
  notes?: string;
}

export interface SaveSearchParams {
  name: string;
  description?: string;
  filters: SearchFilters;
  notificationEnabled?: boolean;
  notificationFrequency?: "instant" | "daily" | "weekly";
}

export interface SavedResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Save a listing for the current user
 */
export async function saveListing(
  params: SaveListingParams,
): Promise<SavedResult<SavedListing>> {
  try {
    // Validate listingId is a string
    if (typeof params.listingId !== "string") {
      console.error("[saveListing] Invalid listingId type:", {
        listingId: params.listingId,
        type: typeof params.listingId,
        params,
      });
      return {
        success: false,
        error: `Invalid listing ID: expected string, got ${typeof params.listingId}`,
      };
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(params.listingId)) {
      console.error("[saveListing] Invalid UUID format:", params.listingId);
      return {
        success: false,
        error: `Invalid listing ID format: ${params.listingId}`,
      };
    }

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }
    const actualUserId = user.id;

    // Validate userId UUID format (reuse uuidRegex)
    if (!uuidRegex.test(actualUserId)) {
      console.error("[saveListing] Invalid userId UUID format:", actualUserId);
      return {
        success: false,
        error: `Invalid user ID format: ${actualUserId}`,
      };
    }

    console.log("[saveListing] Saving listing:", {
      listingId: params.listingId,
      userId: actualUserId,
    });

    // Check if already saved
    console.log("[saveListing] Querying existing:", {
      user_id: actualUserId,
      listing_id: params.listingId,
      types: {
        user_id: typeof actualUserId,
        listing_id: typeof params.listingId,
      },
    });
    const { data: existing } = await supabase
      .from("saved_listings")
      .select("id")
      .eq("user_id", actualUserId)
      .eq("listing_id", params.listingId)
      .single();

    if (existing) {
      // Update notes if already saved
      const { data, error } = await supabase
        .from("saved_listings")
        .update({ notes: params.notes })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) {
        console.error("Update saved listing error:", error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data,
      };
    }

    // Create new saved listing
    console.log("[saveListing] Inserting new:", {
      user_id: actualUserId,
      listing_id: params.listingId,
      notes: params.notes,
      types: {
        user_id: typeof actualUserId,
        listing_id: typeof params.listingId,
      },
    });
    const { data, error } = await supabase
      .from("saved_listings")
      .insert({
        user_id: actualUserId,
        listing_id: params.listingId,
        notes: params.notes,
      })
      .select()
      .single();

    if (error) {
      console.error("Save listing error:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Save listing error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save listing",
    };
  }
}

/**
 * Unsave a listing
 */
export async function unsaveListing(
  listingId: string,
): Promise<SavedResult<void>> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }
    const actualUserId = user.id;

    const { error } = await supabase
      .from("saved_listings")
      .delete()
      .eq("user_id", actualUserId)
      .eq("listing_id", listingId);

    if (error) {
      console.error("Unsave listing error:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Unsave listing error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to unsave listing",
    };
  }
}

/**
 * Check if a listing is saved by the current user
 */
export async function isListingSaved(listingId: string): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) return false;
    const actualUserId = user.id;

    const { data, error } = await supabase
      .from("saved_listings")
      .select("id")
      .eq("user_id", actualUserId)
      .eq("listing_id", listingId)
      .single();

    return !error && !!data;
  } catch (error) {
    console.error("Check saved listing error:", error);
    return false;
  }
}

/**
 * Get user's saved listings
 */
export async function getSavedListings(): Promise<SavedListing[]> {
  try {
    console.log("[getSavedListings] Starting fetch...");
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      console.warn(
        "[getSavedListings] ⚠️ No user authenticated - returning empty array",
      );
      console.warn(
        "[getSavedListings] This might indicate auth state hasn't propagated yet",
      );
      return [];
    }
    const actualUserId = user.id;

    console.log(
      "[getSavedListings] ✅ User authenticated, fetching for user:",
      actualUserId,
    );

    const { data, error } = await supabase
      .from("saved_listings")
      .select(
        `
        *,
        listing:listings (
          *
        )
      `,
      )
      .eq("user_id", actualUserId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[getSavedListings] Database error:", error);
      return [];
    }

    console.log("[getSavedListings] Fetched items:", data?.length || 0);
    console.log(
      "[getSavedListings] Sample data structure:",
      JSON.stringify(data?.[0], null, 2),
    );
    return data || [];
  } catch (error) {
    console.error("Get saved listings error:", error);
    return [];
  }
}

/**
 * Save a search with filters
 * NOTE: This feature is not yet implemented - table doesn't exist
 */
export async function saveSearch(
  params: SaveSearchParams,
): Promise<SavedResult<SavedSearch>> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }
    const actualUserId = user.id;

    // Check for duplicate name
    const { data: existing, error: checkError } = await supabase
      .from("saved_searches")
      .select("id")
      .eq("user_id", actualUserId)
      .eq("name", params.name)
      .single();

    // Table doesn't exist yet
    if (checkError?.code === "PGRST205" || checkError?.code === "42P01") {
      return {
        success: false,
        error: "Saved searches feature is not yet available",
      };
    }

    if (existing) {
      return {
        success: false,
        error: "A saved search with this name already exists",
      };
    }

    // Create saved search
    const { data, error } = await supabase
      .from("saved_searches")
      .insert({
        user_id: actualUserId,
        name: params.name,
        description: params.description,
        filters: params.filters,
        notification_enabled: params.notificationEnabled || false,
        notification_frequency: params.notificationFrequency || "daily",
      })
      .select()
      .single();

    if (error) {
      console.error("Save search error:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Save search error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save search",
    };
  }
}

/**
 * Update a saved search
 */
export async function updateSavedSearch(
  searchId: string,
  updates: Partial<SaveSearchParams>,
): Promise<SavedResult<SavedSearch>> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }
    const actualUserId = user.id;

    // Verify ownership
    const { data: existing } = await supabase
      .from("saved_searches")
      .select("user_id")
      .eq("id", searchId)
      .single();

    if (!existing || existing.user_id !== actualUserId) {
      return {
        success: false,
        error: "Saved search not found or access denied",
      };
    }

    // Update
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined)
      updateData.description = updates.description;
    if (updates.filters !== undefined) updateData.filters = updates.filters;
    if (updates.notificationEnabled !== undefined) {
      updateData.notification_enabled = updates.notificationEnabled;
    }
    if (updates.notificationFrequency !== undefined) {
      updateData.notification_frequency = updates.notificationFrequency;
    }

    const { data, error } = await supabase
      .from("saved_searches")
      .update(updateData)
      .eq("id", searchId)
      .select()
      .single();

    if (error) {
      console.error("Update saved search error:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Update saved search error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update search",
    };
  }
}

/**
 * Delete a saved search
 */
export async function deleteSavedSearch(
  searchId: string,
): Promise<SavedResult<void>> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }
    const actualUserId = user.id;

    const { error } = await supabase
      .from("saved_searches")
      .delete()
      .eq("id", searchId)
      .eq("user_id", actualUserId);

    if (error) {
      console.error("Delete saved search error:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Delete saved search error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete search",
    };
  }
}

/**
 * Get user's saved searches
 * NOTE: This feature is not yet implemented - table doesn't exist
 */
export async function getSavedSearches(): Promise<SavedSearch[]> {
  try {
    console.log("[getSavedSearches] Starting fetch...");
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.warn(
        "[getSavedSearches] ⚠️ No user authenticated - returning empty array",
      );
      return [];
    }

    console.log(
      "[getSavedSearches] ✅ User authenticated, fetching for user:",
      user.id,
    );

    const { data, error } = await supabase
      .from("saved_searches")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      // Table doesn't exist yet - return empty array instead of logging error
      if (error.code === "PGRST205" || error.code === "42P01") {
        console.warn(
          "[getSavedSearches] Table doesn't exist yet - returning empty array",
        );
        return [];
      }
      console.error("[getSavedSearches] ❌ Database error:", error);
      return [];
    }

    console.log(
      "[getSavedSearches] Fetched",
      data?.length || 0,
      "saved searches",
    );
    return data as SavedSearch[];
  } catch (error) {
    console.error("[getSavedSearches] ❌ CRITICAL error:", error);
    return [];
  }
}

/**
 * Run a saved search to get current results
 */
export async function runSavedSearch(
  searchId: string,
): Promise<SavedResult<Listing[]>> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }
    const actualUserId = user.id;

    // Get saved search
    const { data: savedSearch, error: searchError } = await supabase
      .from("saved_searches")
      .select("filters")
      .eq("id", searchId)
      .eq("user_id", actualUserId)
      .single();

    if (searchError || !savedSearch) {
      return {
        success: false,
        error: "Saved search not found",
      };
    }

    // Run search with saved filters
    const { data, error } = await supabase.rpc("fn_search_rank", {
      filters: savedSearch.filters,
      page_number: 0,
      page_size: 50,
    });

    if (error) {
      console.error("Run saved search error:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      data: data?.listings || [],
    };
  } catch (error) {
    console.error("Run saved search error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to run search",
    };
  }
}

/**
 * Get alerts for saved searches
 * NOTE: This feature is not yet implemented - table doesn't exist
 */
export async function getSavedSearchAlerts(
  searchId?: string,
): Promise<SavedSearchAlert[]> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    let query = supabase
      .from("saved_search_alerts")
      .select(
        `
        *,
        saved_search:saved_searches (
          name,
          filters
        ),
        listing:listings (
          id,
          title,
          city,
          availability
        )
      `,
      )
      .eq("user_id", user.id);

    if (searchId) {
      query = query.eq("saved_search_id", searchId);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      // Table doesn't exist yet - return empty array instead of logging error
      if (error.code === "PGRST205" || error.code === "42P01") {
        return [];
      }
      console.error("Get alerts error:", error);
      return [];
    }

    return data as unknown as SavedSearchAlert[];
  } catch (error) {
    console.error("Get alerts error:", error);
    return [];
  }
}

/**
 * Mark alerts as seen
 */
export async function markAlertsAsSeen(
  alertIds: string[],
): Promise<SavedResult<void>> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }
    const actualUserId = user.id;

    const { error } = await supabase
      .from("saved_search_alerts")
      .update({ seen: true })
      .in("id", alertIds)
      .eq("user_id", actualUserId);

    if (error) {
      console.error("Mark alerts seen error:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Mark alerts seen error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to mark alerts",
    };
  }
}

/**
 * Toggle notification for a saved search
 */
export async function toggleSearchNotification(
  searchId: string,
  enabled: boolean,
): Promise<SavedResult<void>> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }
    const actualUserId = user.id;

    const { error } = await supabase
      .from("saved_searches")
      .update({ notification_enabled: enabled })
      .eq("id", searchId)
      .eq("user_id", actualUserId);

    if (error) {
      console.error("Toggle notification error:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Toggle notification error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to toggle notification",
    };
  }
}

/**
 * Get count of unseen alerts
 * NOTE: This feature is not yet implemented - table doesn't exist
 */
export async function getUnseenAlertCount(): Promise<number> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from("saved_search_alerts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("seen", false);

    if (error) {
      // Table doesn't exist yet - return 0 instead of logging error
      if (error.code === "PGRST205" || error.code === "42P01") {
        return 0;
      }
      console.error("Get unseen count error:", error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error("Get unseen count error:", error);
    return 0;
  }
}

/**
 * Batch save multiple listings
 */
export async function batchSaveListings(
  listingIds: string[],
): Promise<SavedResult<number>> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }
    const actualUserId = user.id;

    // Get existing saved listings
    const { data: existing } = await supabase
      .from("saved_listings")
      .select("listing_id")
      .eq("user_id", actualUserId)
      .in("listing_id", listingIds);

    const existingIds = new Set((existing || []).map((s) => s.listing_id));
    const newListings = listingIds
      .filter((id) => !existingIds.has(id))
      .map((listing_id) => ({
        user_id: actualUserId,
        listing_id,
      }));

    if (newListings.length === 0) {
      return {
        success: true,
        data: 0,
      };
    }

    const { data, error } = await supabase
      .from("saved_listings")
      .insert(newListings)
      .select();

    if (error) {
      console.error("Batch save error:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      data: data?.length || 0,
    };
  } catch (error) {
    console.error("Batch save error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save listings",
    };
  }
}

/**
 * Export saved listings as JSON
 */
export async function exportSavedListings(): Promise<SavedResult<string>> {
  try {
    const listings = await getSavedListings();

    const exportData = {
      exportDate: new Date().toISOString(),
      totalListings: listings.length,
      listings: listings.map((s) => ({
        title: s.listing?.title,
        address: s.listing?.address,
        city: s.listing?.city,
        state: s.listing?.state,
        availability: s.listing?.availability,
        notes: s.notes,
        savedDate: s.created_at,
      })),
    };

    const json = JSON.stringify(exportData, null, 2);

    return {
      success: true,
      data: json,
    };
  } catch (error) {
    console.error("Export error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to export",
    };
  }
}
