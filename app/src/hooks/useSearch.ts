import { useMemo } from "react";
import {
  useQuery,
  useInfiniteQuery,
  UseQueryOptions,
  UseInfiniteQueryOptions,
} from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useFilterStore } from "../state/useFilterStore";
import {
  Listing,
  SearchFilters,
  SearchResult,
  LocationBounds,
} from "../types/listing";

// Constants
const ITEMS_PER_PAGE = 20;
const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const CACHE_TIME = 10 * 60 * 1000; // 10 minutes

interface SearchParams {
  filters?: SearchFilters;
  bounds?: LocationBounds;
  sortBy?: "relevance" | "cost" | "distance" | "updated";
  page?: number;
  limit?: number;
  showStale?: boolean;
}

interface SearchResponse {
  listings: SearchResult[];
  totalCount: number;
  hasMore: boolean;
  page: number;
}

/**
 * Transform filter store snapshot to RPC payload
 */
function transformFiltersToRPC(filters: SearchFilters) {
  return {
    housing_type: filters.housingType,
    unit_beds: filters.unitBedType,
    amenities: filters.amenities,
    accessibility: filters.accessibility,
    room_details: filters.roomDetails,
    eligibility: filters.eligibility,
    support_programs: filters.supportPrograms,
    cost: filters.costPayment,
    location: filters.locationEnv,
    rules: filters.rulesRequirements,
    availability: filters.availabilityIntake,
    provider_quality: filters.providerQuality,
    community: filters.communityLifestyle,
    advanced: filters.advanced,
  };
}

/**
 * Call the search RPC function with proper error handling
 * Fallback to simple query if RPC function doesn't exist
 */
async function searchListings(params: SearchParams): Promise<SearchResponse> {
  const {
    filters,
    bounds,
    sortBy = "relevance",
    page = 0,
    limit = ITEMS_PER_PAGE,
    showStale = false,
  } = params;

  try {
    // Simple fallback: just fetch listings from database
    // TODO: Replace with proper search RPC when fn_search_ranks is created
    let query = supabase
      .from("listings")
      .select(
        `
        *,
        provider:profiles!provider_id (
          id,
          full_name,
          username,
          is_verified
        )
      `,
        { count: "exact" },
      )
      .eq("is_active", true);

    // Apply pagination
    const start = page * limit;
    const end = start + limit - 1;
    query = query.range(start, end);

    // Apply ordering
    if (sortBy === "updated") {
      query = query.order("updated_at", { ascending: false });
    } else if (sortBy === "cost") {
      query = query.order("created_at", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Search query error:", error);
      throw new Error(error.message || "Failed to search listings");
    }

    const listings = (data || []).map((item: any) => ({
      ...item,
      score: 0,
      reasons: [],
      distance: 0,
    }));

    return {
      listings,
      totalCount: count || 0,
      hasMore: (count || 0) > (page + 1) * limit,
      page,
    };
  } catch (error) {
    console.error("Search error:", error);
    throw error;
  }
}

/**
 * Fetch a single listing by ID
 */
async function fetchListingById(id: string): Promise<Listing | null> {
  try {
    const { data, error } = await supabase
      .from("listings")
      .select(
        `
        *,
        provider:profiles!provider_id (
          id,
          full_name,
          username,
          is_verified,
          provider_profile
        )
      `,
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("Fetch listing error:", error);
      return null;
    }

    return data as Listing;
  } catch (error) {
    console.error("Fetch listing error:", error);
    return null;
  }
}

/**
 * Hook for searching listings with filters
 */
export function useSearch(
  params?: SearchParams,
  options?: UseQueryOptions<SearchResponse>,
) {
  // Disable filters temporarily to prevent infinite loop
  const mergedParams: SearchParams = useMemo(
    () => ({
      ...params,
      filters: undefined,
    }),
    [params],
  );

  return useQuery({
    queryKey: ["listings", "search", mergedParams],
    queryFn: () => searchListings(mergedParams),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
}

/**
 * Hook for infinite scrolling search results
 */
export function useInfiniteSearch(
  params?: SearchParams,
  options?: UseInfiniteQueryOptions<SearchResponse>,
) {
  // Don't use filters for now - just fetch all listings
  // This prevents infinite loop issues with Zustand state
  const mergedParams: SearchParams = useMemo(
    () => ({
      ...params,
      filters: undefined, // Disable filters temporarily to fix infinite loop
    }),
    [params],
  );

  return useInfiniteQuery({
    queryKey: ["listings", "infinite", mergedParams],
    queryFn: ({ pageParam = 0 }) =>
      searchListings({ ...mergedParams, page: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (lastPage.hasMore) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    retry: 2,
    ...options,
  });
}

/**
 * Hook for fetching a single listing
 */
export function useListing(
  id: string,
  options?: UseQueryOptions<Listing | null>,
) {
  return useQuery({
    queryKey: ["listings", "detail", id],
    queryFn: () => fetchListingById(id),
    enabled: !!id,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    ...options,
  });
}

/**
 * Hook for map-based search with bounds
 */
export function useMapSearch(
  bounds: LocationBounds | null,
  params?: SearchParams,
) {
  return useQuery({
    queryKey: ["listings", "map", bounds],
    queryFn: () =>
      searchListings({
        ...params,
        filters: undefined, // Disable filters temporarily
        bounds: bounds || undefined,
      }),
    enabled: !!bounds,
    staleTime: 1000 * 60, // 1 minute for map updates
    gcTime: CACHE_TIME,
  });
}

/**
 * Hook for nearby listings based on coordinates
 */
export function useNearbyListings(
  lat: number,
  lng: number,
  radiusMiles: number = 5,
  limit: number = 10,
) {
  return useQuery({
    queryKey: ["listings", "nearby", lat, lng, radiusMiles, limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fn_nearby_listings", {
        user_lat: lat,
        user_lng: lng,
        radius_miles: radiusMiles,
        max_results: limit,
      });

      if (error) throw error;
      return data;
    },
    enabled: !!(lat && lng),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  });
}

/**
 * Hook for fetching featured/highlighted listings
 */
export function useFeaturedListings() {
  return useQuery({
    queryKey: ["listings", "featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select(
          `
          *,
          provider:profiles!provider_id (
            id,
            full_name,
            is_verified
          )
        `,
        )
        .eq("is_active", true)
        .eq("verified", true)
        .gt("availability->>beds_today", 0)
        .order("updated_at", { ascending: false })
        .limit(6);

      if (error) throw error;
      return data;
    },
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  });
}
