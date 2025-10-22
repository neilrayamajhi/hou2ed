import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  updateAvailability,
  confirmAvailability,
  getAvailabilityHistory,
  batchUpdateAvailability,
  getListingsNeedingConfirmation,
  getAvailabilityStats,
  type AvailabilityUpdate,
  type AvailabilityResult,
  type AvailabilityHistory,
} from '../services/availability.service';
import { useToast } from './useToast';

interface UseAvailabilityOptions {
  listingId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

/**
 * Hook for managing listing availability
 * Used by providers to update bed counts and confirm availability
 */
export function useAvailability(options?: UseAvailabilityOptions) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch availability history if listingId provided
  const {
    data: history = [],
    isLoading: isLoadingHistory,
    error: historyError,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ['availabilityHistory', options?.listingId],
    queryFn: () => getAvailabilityHistory(options!.listingId!),
    enabled: !!options?.listingId,
    refetchInterval: options?.autoRefresh ? (options.refreshInterval || 60000) : undefined,
  });

  // Update availability mutation
  const updateMutation = useMutation({
    mutationFn: updateAvailability,
    onMutate: () => setIsUpdating(true),
    onSuccess: (result) => {
      setIsUpdating(false);
      if (result.success) {
        showToast('Availability updated successfully', 'success');
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['availabilityHistory'] });
        queryClient.invalidateQueries({ queryKey: ['listings'] });
        queryClient.invalidateQueries({ queryKey: ['providerListings'] });
      } else {
        showToast(result.error || 'Failed to update availability', 'error');
      }
    },
    onError: (error) => {
      setIsUpdating(false);
      showToast('An error occurred while updating availability', 'error');
      console.error('Update availability error:', error);
    },
  });

  // Confirm availability mutation
  const confirmMutation = useMutation({
    mutationFn: confirmAvailability,
    onSuccess: (result) => {
      if (result.success) {
        showToast('Availability confirmed', 'success');
        queryClient.invalidateQueries({ queryKey: ['availabilityHistory'] });
        queryClient.invalidateQueries({ queryKey: ['listings'] });
      } else {
        showToast(result.error || 'Failed to confirm availability', 'error');
      }
    },
    onError: (error) => {
      showToast('An error occurred while confirming availability', 'error');
      console.error('Confirm availability error:', error);
    },
  });

  // Batch update mutation
  const batchUpdateMutation = useMutation({
    mutationFn: batchUpdateAvailability,
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;

      if (successCount > 0) {
        showToast(`Updated ${successCount} listing(s) successfully`, 'success');
        queryClient.invalidateQueries({ queryKey: ['availabilityHistory'] });
        queryClient.invalidateQueries({ queryKey: ['listings'] });
        queryClient.invalidateQueries({ queryKey: ['providerListings'] });
      }

      if (failCount > 0) {
        showToast(`Failed to update ${failCount} listing(s)`, 'warning');
      }
    },
    onError: (error) => {
      showToast('An error occurred during batch update', 'error');
      console.error('Batch update error:', error);
    },
  });

  // Update single listing
  const update = useCallback(
    async (update: AvailabilityUpdate) => {
      return updateMutation.mutateAsync(update);
    },
    [updateMutation]
  );

  // Confirm single listing
  const confirm = useCallback(
    async (listingId: string) => {
      return confirmMutation.mutateAsync(listingId);
    },
    [confirmMutation]
  );

  // Batch update multiple listings
  const batchUpdate = useCallback(
    async (updates: AvailabilityUpdate[]) => {
      return batchUpdateMutation.mutateAsync(updates);
    },
    [batchUpdateMutation]
  );

  // Get current availability from latest history entry
  const getCurrentAvailability = useCallback((): {
    bedsToday: number | null;
    bedsWeek: number | null;
    waitlistDays: number | null;
    lastConfirmed: string | null;
  } => {
    if (history.length === 0) {
      return {
        bedsToday: null,
        bedsWeek: null,
        waitlistDays: null,
        lastConfirmed: null,
      };
    }

    const latest = history[0];
    return {
      bedsToday: latest.beds_available_today,
      bedsWeek: latest.beds_available_this_week,
      waitlistDays: latest.waitlist_days,
      lastConfirmed: latest.created_at,
    };
  }, [history]);

  // Check if needs confirmation (hasn't been confirmed in X days)
  const needsConfirmation = useCallback(
    (days = 7): boolean => {
      const current = getCurrentAvailability();
      if (!current.lastConfirmed) return true;

      const lastConfirmDate = new Date(current.lastConfirmed);
      const daysSinceConfirm = Math.floor(
        (Date.now() - lastConfirmDate.getTime()) / (24 * 60 * 60 * 1000)
      );

      return daysSinceConfirm >= days;
    },
    [getCurrentAvailability]
  );

  return {
    // Data
    history,
    currentAvailability: getCurrentAvailability(),
    needsConfirmation: needsConfirmation(),

    // Loading states
    isLoadingHistory,
    isUpdating,
    isConfirming: confirmMutation.isPending,
    isBatchUpdating: batchUpdateMutation.isPending,

    // Errors
    historyError,

    // Actions
    update,
    confirm,
    batchUpdate,
    refetchHistory,
  };
}

/**
 * Hook for provider dashboard to manage all listings
 * Shows listings needing confirmation and provides batch operations
 */
export function useProviderAvailability() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // Fetch listings needing confirmation
  const {
    data: needingConfirmation = [],
    isLoading: isLoadingNeeds,
    refetch: refetchNeeds,
  } = useQuery({
    queryKey: ['listingsNeedingConfirmation'],
    queryFn: () => getListingsNeedingConfirmation(7),
    refetchInterval: 1000 * 60 * 5, // Check every 5 minutes
  });

  // Confirm all listings
  const confirmAll = useCallback(async () => {
    if (needingConfirmation.length === 0) {
      showToast('No listings need confirmation', 'info');
      return;
    }

    const updates: AvailabilityUpdate[] = needingConfirmation.map(listing => ({
      listingId: listing.id,
      confirmOnly: true,
    }));

    try {
      const results = await batchUpdateAvailability(updates);
      const successCount = results.filter(r => r.success).length;

      if (successCount > 0) {
        showToast(`Confirmed ${successCount} listing(s)`, 'success');
        queryClient.invalidateQueries({ queryKey: ['listingsNeedingConfirmation'] });
        queryClient.invalidateQueries({ queryKey: ['listings'] });
      }

      return results;
    } catch (error) {
      showToast('Failed to confirm listings', 'error');
      console.error('Confirm all error:', error);
      throw error;
    }
  }, [needingConfirmation, queryClient, showToast]);

  // Update multiple listings with same values
  const updateAll = useCallback(
    async (bedsToday?: number, bedsWeek?: number, waitlistDays?: number) => {
      if (needingConfirmation.length === 0) {
        showToast('No listings to update', 'info');
        return;
      }

      const updates: AvailabilityUpdate[] = needingConfirmation.map(listing => ({
        listingId: listing.id,
        bedsToday,
        bedsWeek,
        waitlistDays,
      }));

      try {
        const results = await batchUpdateAvailability(updates);
        const successCount = results.filter(r => r.success).length;

        if (successCount > 0) {
          showToast(`Updated ${successCount} listing(s)`, 'success');
          queryClient.invalidateQueries({ queryKey: ['listingsNeedingConfirmation'] });
          queryClient.invalidateQueries({ queryKey: ['listings'] });
        }

        return results;
      } catch (error) {
        showToast('Failed to update listings', 'error');
        console.error('Update all error:', error);
        throw error;
      }
    },
    [needingConfirmation, queryClient, showToast]
  );

  return {
    // Data
    needingConfirmation,
    totalNeedingConfirmation: needingConfirmation.length,

    // Loading states
    isLoadingNeeds,

    // Actions
    confirmAll,
    updateAll,
    refetchNeeds,
  };
}

/**
 * Hook for availability analytics
 * Provides statistics and insights about availability patterns
 */
export function useAvailabilityStats(listingId: string, days = 30) {
  const {
    data: stats,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['availabilityStats', listingId, days],
    queryFn: () => getAvailabilityStats(listingId, days),
    enabled: !!listingId,
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });

  // Calculate additional insights
  const getInsights = useCallback(() => {
    if (!stats) return null;

    const updateFrequency =
      stats.totalUpdates > 0 ? days / stats.totalUpdates : 0;

    const isActive = stats.lastUpdate &&
      new Date(stats.lastUpdate).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000;

    const confirmationRate =
      (stats.totalConfirmations / (stats.totalUpdates + stats.totalConfirmations)) * 100;

    return {
      updateFrequency, // Days between updates
      isActive, // Updated within last week
      confirmationRate, // Percentage of confirmations vs updates
      averageChange: (stats.averageBedsTodayChange + stats.averageBedsWeekChange) / 2,
    };
  }, [stats, days]);

  return {
    stats,
    insights: getInsights(),
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook for quick availability actions
 * Provides simple increment/decrement functionality
 */
export function useQuickAvailability(listingId: string) {
  const { currentAvailability, update } = useAvailability({ listingId });
  const [pendingChanges, setPendingChanges] = useState<{
    bedsToday?: number;
    bedsWeek?: number;
    waitlistDays?: number;
  }>({});

  // Initialize pending changes with current values
  const initializePendingChanges = useCallback(() => {
    setPendingChanges({
      bedsToday: currentAvailability.bedsToday ?? 0,
      bedsWeek: currentAvailability.bedsWeek ?? 0,
      waitlistDays: currentAvailability.waitlistDays ?? 0,
    });
  }, [currentAvailability]);

  // Increment bed count
  const increment = useCallback((field: 'bedsToday' | 'bedsWeek') => {
    setPendingChanges(prev => ({
      ...prev,
      [field]: Math.min((prev[field] ?? 0) + 1, 100),
    }));
  }, []);

  // Decrement bed count
  const decrement = useCallback((field: 'bedsToday' | 'bedsWeek') => {
    setPendingChanges(prev => ({
      ...prev,
      [field]: Math.max((prev[field] ?? 0) - 1, 0),
    }));
  }, []);

  // Adjust waitlist days
  const adjustWaitlist = useCallback((days: number) => {
    setPendingChanges(prev => ({
      ...prev,
      waitlistDays: Math.max(0, Math.min(days, 365)),
    }));
  }, []);

  // Apply pending changes
  const applyChanges = useCallback(async () => {
    const hasChanges =
      pendingChanges.bedsToday !== currentAvailability.bedsToday ||
      pendingChanges.bedsWeek !== currentAvailability.bedsWeek ||
      pendingChanges.waitlistDays !== currentAvailability.waitlistDays;

    if (!hasChanges) {
      return { success: true, message: 'No changes to apply' };
    }

    return update({
      listingId,
      bedsToday: pendingChanges.bedsToday,
      bedsWeek: pendingChanges.bedsWeek,
      waitlistDays: pendingChanges.waitlistDays,
    });
  }, [listingId, pendingChanges, currentAvailability, update]);

  // Reset pending changes
  const reset = useCallback(() => {
    initializePendingChanges();
  }, [initializePendingChanges]);

  return {
    current: currentAvailability,
    pending: pendingChanges,
    hasChanges:
      pendingChanges.bedsToday !== currentAvailability.bedsToday ||
      pendingChanges.bedsWeek !== currentAvailability.bedsWeek ||
      pendingChanges.waitlistDays !== currentAvailability.waitlistDays,

    // Actions
    increment,
    decrement,
    adjustWaitlist,
    applyChanges,
    reset,
    initializePendingChanges,
  };
}