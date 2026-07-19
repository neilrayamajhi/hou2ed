import { useMemo } from 'react';
import { useQuery, useInfiniteQuery, UseQueryOptions, UseInfiniteQueryOptions } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useFilterStore } from '../state/useFilterStore';
import { Listing, SearchFilters, SearchResult, LocationBounds } from '../types/listing';

// Constants
const ITEMS_PER_PAGE = 20;
const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const CACHE_TIME = 10 * 60 * 1000; // 10 minutes

interface SearchParams {
  filters?: SearchFilters;
  bounds?: LocationBounds;
  sortBy?: 'relevance' | 'cost' | 'distance' | 'updated';
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
 */
async function searchListings(params: SearchParams): Promise<SearchResponse> {
  const { filters, bounds, sortBy = 'relevance', page = 0, limit = ITEMS_PER_PAGE, showStale = false } = params;

  try {
    // Prepare RPC payload
    const rpcPayload = {
      filters: filters ? transformFiltersToRPC(filters) : null,
      bounds: bounds ? {
        north: bounds.north,
        south: bounds.south,
        east: bounds.east,
        west: bounds.west,
      } : null,
      sort_by: sortBy,
      page_number: page,
      page_size: limit,
      show_stale: showStale,
    };

    // Call the search RPC function
    const { data, error } = await supabase.rpc('fn_search_rank', rpcPayload);

    if (error) {
      console.error('Search RPC error:', error);
      throw new Error(error.message || 'Failed to search listings');
    }

    // Transform response to match our interface
    const listings = (data?.listings || []).map((item: any) => ({
      ...item,
      score: item.relevance_score,
      reasons: item.score_reasons || [],
      distance: item.distance_miles,
    }));

    return {
      listings,
      totalCount: data?.total_count || 0,
      hasMore: data?.has_more || false,
      page,
    };
  } catch (error) {
    console.error('Search error:', error);
    throw error;
  }
}

/**
 * Fetch a single listing by ID
 */
async function fetchListingById(id: string): Promise<Listing | null> {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select(`
        id,provider_id,title,description,address,city,state,zip_code,
        lat,lng,housing_type,unit_beds,ada_beds,gender_rooming,
        amenities,accessibility,eligibility,services,rules,cost,intake,
        availability,verified,certifications,images,responsiveness,
        dv_sensitive,is_active,created_at,updated_at,
        provider:profiles!provider_id (
          id,
          full_name,
          username,
          is_verified,
          provider_profile
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Fetch listing error:', error);
      return null;
    }

    return data as Listing;
  } catch (error) {
    console.error('Fetch listing error:', error);
    return null;
  }
}

/**
 * Hook for searching listings with filters
 */
export function useSearch(params?: SearchParams, options?: UseQueryOptions<SearchResponse>) {
  // Get filter snapshot in a stable way
  const filters = useFilterStore((state) => params?.filters || state.snapshot());

  const mergedParams: SearchParams = useMemo(() => ({
    ...params,
    filters,
  }), [params, filters]);

  return useQuery({
    queryKey: ['listings', 'search', mergedParams],
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
  options?: UseInfiniteQueryOptions<SearchResponse>
) {
  const filterSnapshot = useFilterStore((state) => state.snapshot());

  const mergedParams: SearchParams = {
    ...params,
    filters: params?.filters || filterSnapshot,
  };

  return useInfiniteQuery({
    queryKey: ['listings', 'infinite', mergedParams],
    queryFn: ({ pageParam = 0 }) => searchListings({ ...mergedParams, page: pageParam }),
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
export function useListing(id: string, options?: UseQueryOptions<Listing | null>) {
  return useQuery({
    queryKey: ['listings', 'detail', id],
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
export function useMapSearch(bounds: LocationBounds | null, params?: SearchParams) {
  const filterSnapshot = useFilterStore((state) => state.snapshot());

  return useQuery({
    queryKey: ['listings', 'map', bounds, filterSnapshot],
    queryFn: () => searchListings({
      ...params,
      filters: filterSnapshot,
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
  limit: number = 10
) {
  return useQuery({
    queryKey: ['listings', 'nearby', lat, lng, radiusMiles, limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('fn_nearby_listings', {
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
    queryKey: ['listings', 'featured'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select(`
          id,provider_id,title,description,address,city,state,zip_code,
          lat,lng,housing_type,unit_beds,ada_beds,cost,availability,
          verified,images,dv_sensitive,is_active,created_at,updated_at,
          provider:profiles!provider_id (
            id,
            full_name,
            is_verified
          )
        `)
        .eq('is_active', true)
        .eq('verified', true)
        .gt('availability->>beds_today', 0)
        .order('updated_at', { ascending: false })
        .limit(6);

      if (error) throw error;
      return data;
    },
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  });
}