import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  saveListing,
  unsaveListing,
  isListingSaved,
  getSavedListings,
  saveSearch,
  updateSavedSearch,
  deleteSavedSearch,
  getSavedSearches,
  runSavedSearch,
  getSavedSearchAlerts,
  markAlertsAsSeen,
  toggleSearchNotification,
  getUnseenAlertCount,
  batchSaveListings,
  exportSavedListings,
  type SavedListing,
  type SavedSearch,
  type SavedSearchAlert,
  type SaveSearchParams,
} from "../services/saved.service";
import { useFilterStore } from "../state/useFilterStore";
import type { SearchFilters } from "../types/listing";

interface UseSavedListingsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

/**
 * Hook for managing saved listings
 */
export function useSavedListings(options?: UseSavedListingsOptions) {
  const queryClient = useQueryClient();

  // Fetch saved listings
  const {
    data: savedListings = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["savedListings"],
    queryFn: async () => {
      console.log("[useSavedListings] Fetching saved listings...");
      const listings = await getSavedListings();
      console.log(
        "[useSavedListings] Fetched",
        listings.length,
        "saved listings",
      );
      if (listings.length === 0) {
        console.log(
          "[useSavedListings] No saved listings found - this could be normal or an error",
        );
      }
      return listings;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnMount: true, // Always refetch when component mounts
    refetchInterval: options?.autoRefresh
      ? options.refreshInterval || 60000
      : undefined,
  });

  // Save listing mutation
  const saveMutation = useMutation({
    mutationFn: saveListing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedListings"] });
      queryClient.invalidateQueries({ queryKey: ["isListingSaved"] });
    },
  });

  // Unsave listing mutation
  const unsaveMutation = useMutation({
    mutationFn: unsaveListing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedListings"] });
      queryClient.invalidateQueries({ queryKey: ["isListingSaved"] });
    },
  });

  // Batch save mutation
  const batchSaveMutation = useMutation({
    mutationFn: batchSaveListings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedListings"] });
    },
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: exportSavedListings,
  });

  // Toggle save status
  const toggleSave = useCallback(
    async (listingId: string, notes?: string) => {
      const isSaved = savedListings.some((s) => s.listing_id === listingId);

      if (isSaved) {
        await unsaveMutation.mutateAsync(listingId);
      } else {
        await saveMutation.mutateAsync({ listingId, notes });
      }
    },
    [savedListings, saveMutation, unsaveMutation],
  );

  // Check if listing is saved
  const isSaved = useCallback(
    (listingId: string): boolean => {
      return savedListings.some((s) => s.listing_id === listingId);
    },
    [savedListings],
  );

  // Get saved listing by ID
  const getSavedListing = useCallback(
    (listingId: string): SavedListing | undefined => {
      return savedListings.find((s) => s.listing_id === listingId);
    },
    [savedListings],
  );

  // Update notes for saved listing
  const updateNotes = useCallback(
    async (listingId: string, notes: string) => {
      await saveMutation.mutateAsync({ listingId, notes });
    },
    [saveMutation],
  );

  // Export saved listings
  const exportListings = useCallback(async () => {
    const result = await exportMutation.mutateAsync();

    if (result.success && result.data) {
      // Create download link
      const blob = new Blob([result.data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `saved_listings_${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }

    return result;
  }, [exportMutation]);

  return {
    savedListings,
    isLoading,
    error,
    refetch,

    // Actions
    save: saveMutation.mutateAsync,
    unsave: unsaveMutation.mutateAsync,
    toggleSave,
    batchSave: batchSaveMutation.mutateAsync,
    updateNotes,
    exportListings,

    // Status
    isSaving: saveMutation.isPending,
    isUnsaving: unsaveMutation.isPending,
    isBatchSaving: batchSaveMutation.isPending,
    isExporting: exportMutation.isPending,

    // Helpers
    isSaved,
    getSavedListing,
    count: savedListings.length,
  };
}

/**
 * Hook for managing saved searches
 */
export function useSavedSearches() {
  const queryClient = useQueryClient();
  const filterStore = useFilterStore();

  // Fetch saved searches
  const {
    data: savedSearches = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["savedSearches"],
    queryFn: async () => {
      console.log("[useSavedSearches] Fetching saved searches...");
      const searches = await getSavedSearches();
      console.log(
        "[useSavedSearches] Fetched",
        searches.length,
        "saved searches",
      );
      return searches;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    refetchOnMount: true, // Always refetch when component mounts
  });

  // Save search mutation
  const saveSearchMutation = useMutation({
    mutationFn: saveSearch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedSearches"] });
    },
  });

  // Update search mutation
  const updateSearchMutation = useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<SaveSearchParams>;
    }) => updateSavedSearch(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedSearches"] });
    },
  });

  // Delete search mutation
  const deleteSearchMutation = useMutation({
    mutationFn: deleteSavedSearch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedSearches"] });
    },
  });

  // Run search mutation
  const runSearchMutation = useMutation({
    mutationFn: runSavedSearch,
  });

  // Toggle notification mutation
  const toggleNotificationMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      toggleSearchNotification(id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedSearches"] });
    },
  });

  // Save current filters as search
  const saveCurrentSearch = useCallback(
    async (name: string, description?: string) => {
      const currentFilters = filterStore.snapshot();

      return saveSearchMutation.mutateAsync({
        name,
        description,
        filters: currentFilters,
        notificationEnabled: false,
      });
    },
    [filterStore, saveSearchMutation],
  );

  // Load saved search filters
  const loadSearch = useCallback(
    (searchId: string) => {
      const search = savedSearches.find((s) => s.id === searchId);
      if (search) {
        // Apply filters to store
        Object.entries(search.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            filterStore.setFilter(key as keyof SearchFilters, value);
          }
        });
        return true;
      }
      return false;
    },
    [savedSearches, filterStore],
  );

  // Get search by ID
  const getSearch = useCallback(
    (searchId: string): SavedSearch | undefined => {
      return savedSearches.find((s) => s.id === searchId);
    },
    [savedSearches],
  );

  // Check if current filters match a saved search
  const getCurrentMatchingSearch = useCallback((): SavedSearch | undefined => {
    const currentFilters = filterStore.snapshot();

    return savedSearches.find((search) => {
      return JSON.stringify(search.filters) === JSON.stringify(currentFilters);
    });
  }, [savedSearches, filterStore]);

  return {
    savedSearches,
    isLoading,
    error,
    refetch,

    // Actions
    saveSearch: saveSearchMutation.mutateAsync,
    saveCurrentSearch,
    updateSearch: updateSearchMutation.mutateAsync,
    deleteSearch: deleteSearchMutation.mutateAsync,
    runSearch: runSearchMutation.mutateAsync,
    loadSearch,
    toggleNotification: toggleNotificationMutation.mutateAsync,

    // Status
    isSaving: saveSearchMutation.isPending,
    isUpdating: updateSearchMutation.isPending,
    isDeleting: deleteSearchMutation.isPending,
    isRunning: runSearchMutation.isPending,

    // Helpers
    getSearch,
    getCurrentMatchingSearch,
    count: savedSearches.length,
  };
}

/**
 * Hook for managing saved search alerts
 */
export function useSavedSearchAlerts(searchId?: string) {
  const queryClient = useQueryClient();
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());

  // Fetch alerts
  const {
    data: alerts = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["savedSearchAlerts", searchId],
    queryFn: () => getSavedSearchAlerts(searchId),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Fetch unseen count
  const { data: unseenCount = 0 } = useQuery({
    queryKey: ["unseenAlertCount"],
    queryFn: getUnseenAlertCount,
    refetchInterval: 1000 * 60, // Check every minute
  });

  // Mark as seen mutation
  const markSeenMutation = useMutation({
    mutationFn: markAlertsAsSeen,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedSearchAlerts"] });
      queryClient.invalidateQueries({ queryKey: ["unseenAlertCount"] });
    },
  });

  // Toggle alert selection
  const toggleSelection = useCallback((alertId: string) => {
    setSelectedAlerts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(alertId)) {
        newSet.delete(alertId);
      } else {
        newSet.add(alertId);
      }
      return newSet;
    });
  }, []);

  // Select all alerts
  const selectAll = useCallback(() => {
    setSelectedAlerts(new Set(alerts.map((a) => a.id)));
  }, [alerts]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedAlerts(new Set());
  }, []);

  // Mark selected as seen
  const markSelectedAsSeen = useCallback(async () => {
    if (selectedAlerts.size > 0) {
      await markSeenMutation.mutateAsync(Array.from(selectedAlerts));
      clearSelection();
    }
  }, [selectedAlerts, markSeenMutation, clearSelection]);

  // Mark all as seen
  const markAllAsSeen = useCallback(async () => {
    const unseenAlerts = alerts.filter((a) => !a.seen).map((a) => a.id);
    if (unseenAlerts.length > 0) {
      await markSeenMutation.mutateAsync(unseenAlerts);
    }
  }, [alerts, markSeenMutation]);

  // Auto-mark as seen after viewing
  useEffect(() => {
    const timer = setTimeout(() => {
      const unseenAlerts = alerts.filter((a) => !a.seen).map((a) => a.id);
      if (unseenAlerts.length > 0) {
        markAlertsAsSeen(unseenAlerts);
      }
    }, 5000); // Mark as seen after 5 seconds

    return () => clearTimeout(timer);
  }, [alerts]);

  return {
    alerts,
    unseenCount,
    selectedAlerts,
    isLoading,
    error,
    refetch,

    // Actions
    toggleSelection,
    selectAll,
    clearSelection,
    markSelectedAsSeen,
    markAllAsSeen,

    // Status
    isMarkingSeen: markSeenMutation.isPending,
    hasUnseen: alerts.some((a) => !a.seen),
    hasSelection: selectedAlerts.size > 0,
  };
}

/**
 * Hook to check if a specific listing is saved
 */
export function useIsListingSaved(listingId: string) {
  const { data: isSaved = false } = useQuery({
    queryKey: ["isListingSaved", listingId],
    queryFn: () => isListingSaved(listingId),
    enabled: !!listingId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return isSaved;
}
