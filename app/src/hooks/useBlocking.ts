import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import {
  blockUser,
  unblockUser,
  getBlockedUsers,
  isUserBlocked,
  getBlockStatus,
  type BlockedUser,
  type BlockStatus,
} from "../services/block.service";

interface UseBlockedUsersOptions {
  limit?: number;
  offset?: number;
}

/**
 * Hook for managing blocked users
 */
export function useBlockedUsers(options?: UseBlockedUsersOptions) {
  const queryClient = useQueryClient();

  // Fetch blocked users
  const {
    data: blockedUsers = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["blockedUsers", options],
    queryFn: async () => {
      console.log("[useBlockedUsers] Fetching blocked users...");
      const users = await getBlockedUsers(supabase, options);
      console.log("[useBlockedUsers] Fetched", users.length, "blocked users");
      return users;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Block user mutation
  const blockMutation = useMutation({
    mutationFn: (userId: string) => blockUser(supabase, userId),
    onSuccess: () => {
      console.log("[useBlockedUsers] Block successful, invalidating queries");
      queryClient.invalidateQueries({ queryKey: ["blockedUsers"] });
      queryClient.invalidateQueries({ queryKey: ["blockStatus"] });
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["savedListings"] });
    },
    onError: (error: Error) => {
      console.error("[useBlockedUsers] Block failed:", error.message);
    },
  });

  // Unblock user mutation
  const unblockMutation = useMutation({
    mutationFn: (userId: string) => unblockUser(supabase, userId),
    onSuccess: () => {
      console.log("[useBlockedUsers] Unblock successful, invalidating queries");
      queryClient.invalidateQueries({ queryKey: ["blockedUsers"] });
      queryClient.invalidateQueries({ queryKey: ["blockStatus"] });
      queryClient.invalidateQueries({ queryKey: ["listings"] });
    },
    onError: (error: Error) => {
      console.error("[useBlockedUsers] Unblock failed:", error.message);
    },
  });

  // Check if user is blocked
  const isBlocked = useCallback(
    (userId: string): boolean => {
      return blockedUsers.some((b) => b.blocked_id === userId);
    },
    [blockedUsers],
  );

  // Get blocked user by ID
  const getBlockedUser = useCallback(
    (userId: string): BlockedUser | undefined => {
      return blockedUsers.find((b) => b.blocked_id === userId);
    },
    [blockedUsers],
  );

  return {
    blockedUsers,
    isLoading,
    error,
    refetch,

    // Actions
    block: blockMutation.mutateAsync,
    unblock: unblockMutation.mutateAsync,

    // Status
    isBlocking: blockMutation.isPending,
    isUnblocking: unblockMutation.isPending,

    // Helpers
    isBlocked,
    getBlockedUser,
    count: blockedUsers.length,
  };
}

/**
 * Hook for blocking a user
 */
export function useBlockUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => blockUser(supabase, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blockedUsers"] });
      queryClient.invalidateQueries({ queryKey: ["blockStatus"] });
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["savedListings"] });
    },
  });
}

/**
 * Hook for unblocking a user
 */
export function useUnblockUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => unblockUser(supabase, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blockedUsers"] });
      queryClient.invalidateQueries({ queryKey: ["blockStatus"] });
      queryClient.invalidateQueries({ queryKey: ["listings"] });
    },
  });
}

/**
 * Hook to check if a specific user is blocked by current user
 */
export function useIsUserBlocked(userId: string | undefined) {
  const { data: isBlocked = false, isLoading } = useQuery({
    queryKey: ["isUserBlocked", userId],
    queryFn: () => isUserBlocked(supabase, userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return { isBlocked, isLoading };
}

/**
 * Hook to get block status between current user and another user
 * Returns both directions: whether you blocked them, and whether they blocked you
 */
export function useBlockStatus(userId: string | undefined) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["blockStatus", userId],
    queryFn: () => getBlockStatus(supabase, userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    blockStatus: data || { isBlockedByMe: false, hasBlockedMe: false },
    isLoading,
    error,
  };
}
