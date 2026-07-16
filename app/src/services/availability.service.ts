import { supabase } from "../lib/supabase";

export interface AvailabilityUpdate {
  listingId: string;
  bedsToday?: number;
  bedsWeek?: number;
  waitlistDays?: number;
  confirmOnly?: boolean;
}

export interface AvailabilityResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    listing_id: string;
    beds_today: number;
    beds_week: number;
    waitlist_days: number;
    last_confirmed: string;
    confirmed_at?: string;
    changes?: Array<{
      field: string;
      from: any;
      to: any;
    }>;
  };
}

export interface AvailabilityHistory {
  id: string;
  listing_id: string;
  provider_id: string;
  beds_available_today: number | null;
  beds_available_this_week: number | null;
  waitlist_days: number | null;
  change_type: "created" | "updated" | "confirmed";
  changes: Array<{
    field: string;
    from: any;
    to: any;
  }>;
  notes: string | null;
  created_at: string;
}

/**
 * Update availability for a listing
 * Providers can update bed counts or confirm no changes
 */
export async function updateAvailability(
  update: AvailabilityUpdate,
): Promise<AvailabilityResult> {
  try {
    const { data, error } = await supabase.rpc("fn_update_availability", {
      p_listing_id: update.listingId,
      p_beds_today: update.bedsToday ?? null,
      p_beds_week: update.bedsWeek ?? null,
      p_waitlist_days: update.waitlistDays ?? null,
      p_confirm_only: update.confirmOnly ?? false,
    });

    if (error) {
      console.error("Error updating availability:", error);
      return {
        success: false,
        error: error.message || "Failed to update availability",
      };
    }

    return data;
  } catch (err) {
    console.error("Unexpected error updating availability:", err);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Confirm current availability without changes
 * Shorthand for updateAvailability with confirmOnly flag
 */
export async function confirmAvailability(
  listingId: string,
): Promise<AvailabilityResult> {
  return updateAvailability({
    listingId,
    confirmOnly: true,
  });
}

/**
 * Get availability history for a listing
 */
export async function getAvailabilityHistory(
  listingId: string,
  limit = 50,
): Promise<AvailabilityHistory[]> {
  try {
    const { data, error } = await supabase
      .from("availability_history")
      .select("*")
      .eq("listing_id", listingId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching availability history:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Unexpected error fetching history:", err);
    return [];
  }
}

/**
 * Batch update availability for multiple listings
 * Useful for providers managing multiple properties
 */
export async function batchUpdateAvailability(
  updates: AvailabilityUpdate[],
): Promise<AvailabilityResult[]> {
  const results = await Promise.all(
    updates.map((update) => updateAvailability(update)),
  );
  return results;
}

/**
 * Get provider's listings that need availability confirmation
 * Returns listings that haven't been confirmed in the specified days
 */
export async function getListingsNeedingConfirmation(
  daysSinceLastConfirm = 7,
  userId?: string,
): Promise<
  Array<{
    id: string;
    name: string;
    last_confirmed: string;
    days_since_confirmation: number;
  }>
> {
  try {
    // Get user ID if not provided
    const actualUserId =
      userId || (await supabase.auth.getUser()).data.user?.id;

    if (!actualUserId) {
      return [];
    }

    // There is no separate "providers" table - listings.provider_id is the
    // provider's own profile/auth id directly (same pattern used by RLS
    // policies elsewhere, e.g. "listings WHERE provider_id = auth.uid()").
    const { data, error } = await supabase
      .from("listings")
      .select("id, name:title, last_confirmed")
      .eq("provider_id", actualUserId)
      .lt(
        "last_confirmed",
        new Date(
          Date.now() - daysSinceLastConfirm * 24 * 60 * 60 * 1000,
        ).toISOString(),
      );

    if (error) {
      console.error("Error fetching listings needing confirmation:", error);
      return [];
    }

    return (data || []).map((listing) => ({
      ...listing,
      days_since_confirmation: Math.floor(
        (Date.now() - new Date(listing.last_confirmed).getTime()) /
          (24 * 60 * 60 * 1000),
      ),
    }));
  } catch (err) {
    console.error("Unexpected error:", err);
    return [];
  }
}

/**
 * Get availability statistics for a listing
 * Useful for analytics and reporting
 */
export async function getAvailabilityStats(
  listingId: string,
  days = 30,
): Promise<{
  totalUpdates: number;
  totalConfirmations: number;
  averageBedsTodayChange: number;
  averageBedsWeekChange: number;
  lastUpdate: string | null;
}> {
  try {
    const startDate = new Date(
      Date.now() - days * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data, error } = await supabase
      .from("availability_history")
      .select("*")
      .eq("listing_id", listingId)
      .gte("created_at", startDate)
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      return {
        totalUpdates: 0,
        totalConfirmations: 0,
        averageBedsTodayChange: 0,
        averageBedsWeekChange: 0,
        lastUpdate: null,
      };
    }

    const updates = data.filter((h) => h.change_type === "updated");
    const confirmations = data.filter((h) => h.change_type === "confirmed");

    // Calculate average changes
    let bedsTodayChanges = 0;
    let bedsWeekChanges = 0;
    let changeCount = 0;

    updates.forEach((update) => {
      if (update.changes && Array.isArray(update.changes)) {
        update.changes.forEach((change) => {
          if (
            change.field === "beds_today" &&
            typeof change.from === "number" &&
            typeof change.to === "number"
          ) {
            bedsTodayChanges += Math.abs(change.to - change.from);
            changeCount++;
          }
          if (
            change.field === "beds_week" &&
            typeof change.from === "number" &&
            typeof change.to === "number"
          ) {
            bedsWeekChanges += Math.abs(change.to - change.from);
            changeCount++;
          }
        });
      }
    });

    return {
      totalUpdates: updates.length,
      totalConfirmations: confirmations.length,
      averageBedsTodayChange:
        changeCount > 0 ? bedsTodayChanges / changeCount : 0,
      averageBedsWeekChange:
        changeCount > 0 ? bedsWeekChanges / changeCount : 0,
      lastUpdate: data[0]?.created_at || null,
    };
  } catch (err) {
    console.error("Unexpected error getting stats:", err);
    return {
      totalUpdates: 0,
      totalConfirmations: 0,
      averageBedsTodayChange: 0,
      averageBedsWeekChange: 0,
      lastUpdate: null,
    };
  }
}
