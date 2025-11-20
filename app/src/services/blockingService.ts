/**
 * Blocking Service
 * Handles user blocking/unblocking functionality similar to Instagram
 *
 * Key Concepts for Beginners:
 * - When you block someone, they can't interact with your content
 * - Blocking is bidirectional: both users can't see each other's stuff
 * - This service provides functions to block, unblock, and check block status
 */

import { supabase } from "../lib/supabase";

/**
 * Block a user
 * @param blockedUserId - The ID of the user to block
 * @returns Success status and any error
 */
export async function blockUser(blockedUserId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Can't block yourself
    if (user.id === blockedUserId) {
      return { success: false, error: "Cannot block yourself" };
    }

    console.log('🔒 Attempting to insert block record:', {
      blocker_id: user.id,
      blocked_id: blockedUserId,
    });

    // Insert block record
    const { data: blockData, error } = await supabase.from("blocks").insert({
      blocker_id: user.id,
      blocked_id: blockedUserId,
    }).select();

    if (error) {
      console.error("❌ Error inserting block record:", error);
      console.error("❌ Error details:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return { success: false, error: error.message };
    }

    console.log('✅ Block record inserted successfully:', blockData);

    // If current user is a provider, auto-reject all pending applications from blocked seeker
    await autoRejectApplicationsFromBlockedUser(user.id, blockedUserId);

    return { success: true };
  } catch (error) {
    console.error("Error in blockUser:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Unblock a user
 * @param blockedUserId - The ID of the user to unblock
 * @returns Success status and any error
 */
export async function unblockUser(blockedUserId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Delete block record
    const { error } = await supabase
      .from("blocks")
      .delete()
      .eq("blocker_id", user.id)
      .eq("blocked_id", blockedUserId);

    if (error) {
      console.error("Error unblocking user:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in unblockUser:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check if current user has blocked another user
 * @param userId - The ID of the user to check
 * @returns True if blocked, false otherwise
 */
export async function hasBlockedUser(userId: string): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return false;

    const { data, error } = await supabase
      .from("blocks")
      .select("id")
      .eq("blocker_id", user.id)
      .eq("blocked_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "no rows returned" - that's ok
      console.error("Error checking block status:", error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error("Error in hasBlockedUser:", error);
    return false;
  }
}

/**
 * Check if there's any blocking relationship between current user and another user
 * (either direction - current user blocked them OR they blocked current user)
 * @param userId - The ID of the user to check
 * @returns True if there's a blocking relationship, false otherwise
 */
export async function isBlockedRelationship(userId: string): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return false;

    // Check both directions
    const { data, error } = await supabase
      .from("blocks")
      .select("id")
      .or(`blocker_id.eq.${user.id},blocker_id.eq.${userId}`)
      .or(`blocked_id.eq.${user.id},blocked_id.eq.${userId}`);

    if (error) {
      console.error("Error checking blocking relationship:", error);
      return false;
    }

    // If there's any block record, there's a blocking relationship
    return data && data.length > 0;
  } catch (error) {
    console.error("Error in isBlockedRelationship:", error);
    return false;
  }
}

/**
 * Get list of all users current user has blocked
 * @returns Array of blocked user IDs
 */
export async function getBlockedUsers(): Promise<string[]> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
      .from("blocks")
      .select("blocked_id")
      .eq("blocker_id", user.id);

    if (error) {
      console.error("Error getting blocked users:", error);
      return [];
    }

    return data ? data.map((block) => block.blocked_id) : [];
  } catch (error) {
    console.error("Error in getBlockedUsers:", error);
    return [];
  }
}

/**
 * Get list of users who have blocked the current user
 * @returns Array of blocker user IDs
 */
export async function getUsersWhoBlockedMe(): Promise<string[]> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
      .from("blocks")
      .select("blocker_id")
      .eq("blocked_id", user.id);

    if (error) {
      console.error("Error getting users who blocked me:", error);
      return [];
    }

    return data ? data.map((block) => block.blocker_id) : [];
  } catch (error) {
    console.error("Error in getUsersWhoBlockedMe:", error);
    return [];
  }
}

/**
 * Get complete list of all users involved in blocking (either direction)
 * This is useful for filtering content
 * @returns Array of user IDs that have any blocking relationship with current user
 */
export async function getAllBlockedRelationships(): Promise<string[]> {
  try {
    const blockedByMe = await getBlockedUsers();
    const blockedMe = await getUsersWhoBlockedMe();

    // Combine and deduplicate
    const allBlocked = [...new Set([...blockedByMe, ...blockedMe])];
    return allBlocked;
  } catch (error) {
    console.error("Error in getAllBlockedRelationships:", error);
    return [];
  }
}

/**
 * Auto-reject all pending applications from a blocked user to any of the blocker's listings
 * This is called when a provider blocks a seeker
 * @param blockerId - The ID of the user doing the blocking (provider)
 * @param blockedUserId - The ID of the user being blocked (seeker)
 */
async function autoRejectApplicationsFromBlockedUser(
  blockerId: string,
  blockedUserId: string
): Promise<void> {
  try {
    // Get all listings owned by the blocker
    const { data: listings, error: listingsError } = await supabase
      .from("listings")
      .select("id")
      .eq("provider_id", blockerId);

    if (listingsError || !listings || listings.length === 0) {
      // No listings or error - nothing to reject
      return;
    }

    const listingIds = listings.map((listing) => listing.id);

    // Find all pending applications from blocked user to any of these listings
    const { data: pendingApps, error: appsError } = await supabase
      .from("applications")
      .select("id, stage_timestamps")
      .eq("seeker_id", blockedUserId)
      .in("listing_id", listingIds)
      .in("status", ["new", "under_review", "docs_needed", "interview_scheduled", "waitlisted"]);

    if (appsError || !pendingApps || pendingApps.length === 0) {
      // No pending applications - nothing to reject
      return;
    }

    // Auto-reject all pending applications
    const rejectionTime = new Date().toISOString();
    let rejectedCount = 0;

    // Update each application individually to properly merge stage_timestamps
    for (const app of pendingApps) {
      const updatedTimestamps = {
        ...(app.stage_timestamps || {}),
        rejected: rejectionTime,
      };

      const { error: updateError } = await supabase
        .from("applications")
        .update({
          status: "rejected",
          stage_timestamps: updatedTimestamps,
          notes: "Application auto-rejected: Provider has blocked this user",
          updated_at: rejectionTime,
        })
        .eq("id", app.id);

      if (updateError) {
        console.error(`Error rejecting application ${app.id}:`, updateError);
      } else {
        rejectedCount++;
      }
    }

    console.log(`Auto-rejected ${rejectedCount} of ${pendingApps.length} application(s) from blocked user`);
  } catch (error) {
    console.error("Error in autoRejectApplicationsFromBlockedUser:", error);
    // Don't throw - blocking should still succeed even if auto-reject fails
  }
}
