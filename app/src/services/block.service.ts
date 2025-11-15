import type { SupabaseClient } from "@supabase/supabase-js";

export type BlockedUser = {
  id: string;
  blocked_id: string;
  blocked_user: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: "seeker" | "provider";
  };
  created_at: string;
};

export type BlockStatus = {
  isBlockedByMe: boolean;
  hasBlockedMe: boolean;
};

/**
 * Block a user (provider or seeker)
 * If a provider blocks a seeker, their active applications will be auto-rejected
 * If a seeker blocks a provider, the provider's listings will be hidden
 */
export async function blockUser(
  supabase: SupabaseClient,
  blockedUserId: string,
): Promise<void> {
  console.log("[blockUser] Blocking user:", blockedUserId);

  // Get current user to check if they're a provider
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();
  if (!currentUser) {
    throw new Error("Not authenticated");
  }

  // Get current user's profile to check role
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", currentUser.id)
    .single();

  console.log("[blockUser] Current user role:", currentProfile?.role);

  // Insert the block
  const { error } = await supabase.from("blocks").insert({
    blocked_id: blockedUserId,
  });

  if (error) {
    // Handle specific error codes with user-friendly messages
    if (error.code === "23505") {
      // Unique constraint violation
      throw new Error("User is already blocked");
    }
    if (error.code === "23514") {
      // Check constraint violation (self-block)
      throw new Error("Cannot block yourself");
    }
    throw new Error(`Failed to block user: ${error.message}`);
  }

  console.log("[blockUser] Block created successfully");

  // CLIENT-SIDE AUTO-REJECTION: If provider blocking seeker, reject their applications
  // This is a backup in case the database trigger doesn't fire
  if (currentProfile?.role === "provider") {
    console.log(
      "[blockUser] Provider blocking seeker - auto-rejecting applications",
    );

    try {
      // Get provider's listings
      const { data: listings } = await supabase
        .from("listings")
        .select("id")
        .eq("provider_id", currentUser.id);

      if (listings && listings.length > 0) {
        const listingIds = listings.map((l) => l.id);
        console.log(
          "[blockUser] Found",
          listingIds.length,
          "listings to check",
        );

        // Update applications from blocked seeker to rejected
        const { data: updated, error: updateError } = await supabase
          .from("applications")
          .update({
            status: "rejected",
            updated_at: new Date().toISOString(),
            notes: "Auto-rejected: Provider blocked applicant",
          })
          .eq("seeker_id", blockedUserId)
          .in("listing_id", listingIds)
          .not("status", "in", '("rejected","withdrawn")')
          .select();

        if (updateError) {
          console.error(
            "[blockUser] Error auto-rejecting applications:",
            updateError,
          );
        } else {
          console.log(
            "[blockUser] Auto-rejected",
            updated?.length || 0,
            "applications",
          );
        }
      }
    } catch (autoRejectError) {
      console.error(
        "[blockUser] Error during auto-rejection:",
        autoRejectError,
      );
      // Don't throw - blocking succeeded, auto-rejection is a bonus
    }
  }
}

/**
 * Unblock a user
 */
export async function unblockUser(
  supabase: SupabaseClient,
  blockedUserId: string,
): Promise<void> {
  const { error } = await supabase
    .from("blocks")
    .delete()
    .eq("blocked_id", blockedUserId);

  if (error) {
    throw new Error(`Failed to unblock user: ${error.message}`);
  }
}

/**
 * Get list of users blocked by current user
 * Includes pagination support for large block lists
 */
export async function getBlockedUsers(
  supabase: SupabaseClient,
  options?: { limit?: number; offset?: number },
): Promise<BlockedUser[]> {
  let query = supabase
    .from("blocks")
    .select(
      `
      id,
      blocked_id,
      created_at,
      blocked_user:profiles!blocks_blocked_id_fkey (
        id,
        full_name,
        avatar_url,
        role
      )
    `,
    )
    .order("created_at", { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    const limit = options.limit || 20;
    query = query.range(options.offset, options.offset + limit - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch blocked users: ${error.message}`);
  }

  return (data as unknown as BlockedUser[]) || [];
}

/**
 * Check if a specific user is blocked by current user
 */
export async function isUserBlocked(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const currentUser = await supabase.auth.getUser();
  if (!currentUser.data.user) {
    return false;
  }

  const { data } = await supabase.rpc("is_user_blocked", {
    blocker: currentUser.data.user.id,
    blocked: userId,
  });

  return data || false;
}

/**
 * Get block status between current user and another user
 * Returns both directions: whether you blocked them, and whether they blocked you
 */
export async function getBlockStatus(
  supabase: SupabaseClient,
  userId: string,
): Promise<BlockStatus> {
  const currentUser = await supabase.auth.getUser();
  if (!currentUser.data.user) {
    return { isBlockedByMe: false, hasBlockedMe: false };
  }

  const currentUserId = currentUser.data.user.id;

  // Check if current user blocked the target user
  const { data: isBlockedByMe } = await supabase
    .from("blocks")
    .select("id")
    .eq("blocker_id", currentUserId)
    .eq("blocked_id", userId)
    .maybeSingle();

  // Check if target user blocked current user
  const { data: hasBlockedMe } = await supabase
    .from("blocks")
    .select("id")
    .eq("blocker_id", userId)
    .eq("blocked_id", currentUserId)
    .maybeSingle();

  return {
    isBlockedByMe: !!isBlockedByMe,
    hasBlockedMe: !!hasBlockedMe,
  };
}

/**
 * Check if current user can apply to a listing (not blocked by provider)
 * Returns whether the user can apply and the reason if they cannot
 */
export async function canApplyToListing(
  supabase: SupabaseClient,
  listingId: string,
): Promise<{ canApply: boolean; reason?: string }> {
  console.log("[canApplyToListing] Checking listing:", listingId);

  const currentUser = await supabase.auth.getUser();
  if (!currentUser.data.user) {
    console.log("[canApplyToListing] ❌ User not authenticated");
    return { canApply: false, reason: "Not authenticated" };
  }

  console.log("[canApplyToListing] Current user:", currentUser.data.user.id);

  // Get provider ID from listing
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("provider_id")
    .eq("id", listingId)
    .single();

  console.log(
    "[canApplyToListing] Listing data:",
    listing,
    "Error:",
    listingError,
  );

  if (listingError || !listing) {
    console.log("[canApplyToListing] ❌ Listing not found");
    return { canApply: false, reason: "Listing not found" };
  }

  console.log(
    "[canApplyToListing] Provider ID:",
    listing.provider_id,
    "Checking if they blocked user:",
    currentUser.data.user.id,
  );

  // Check if provider has blocked this user
  const { data: block, error: blockError } = await supabase
    .from("blocks")
    .select("id")
    .eq("blocker_id", listing.provider_id)
    .eq("blocked_id", currentUser.data.user.id)
    .maybeSingle();

  console.log(
    "[canApplyToListing] Block query result:",
    block,
    "Error:",
    blockError,
  );

  if (block) {
    console.log("[canApplyToListing] ❌ User is blocked by provider!");
    return {
      canApply: false,
      reason: "You cannot apply to this listing. The provider has blocked you.",
    };
  }

  console.log("[canApplyToListing] ✅ User can apply");
  return { canApply: true };
}
