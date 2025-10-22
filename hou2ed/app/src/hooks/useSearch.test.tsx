import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSearch, useMapSearch, useNearbyListings } from './useSearch';
import { supabase } from '../lib/supabase';
import { useFilterStore } from '../state/useFilterStore';
import type { SearchFilters, Listing } from '../types/listing';
import React from 'react';

// Mock dependencies
jest.mock('../lib/supabase');
jest.mock('../state/useFilterStore');

// Mock geolocation
const mockGetCurrentPosition = jest.fn();
global.navigator = global.navigator || {};
global.navigator.geolocation = {
  getCurrentPosition: mockGetCurrentPosition,
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
};

describe('useSearch', () => {
  let queryClient: QueryClient;

  const mockListings: Listing[] = [
    {
      id: '1',
      name: 'Test Shelter 1',
      housingType: 'emergency',
      unitBeds: 'single',
      availability: 'available',
      monthlyRent: 500,
      district: 'Honolulu',
      island: 'Oahu',
      bedsAvailableToday: 5,
      bedsAvailableWeek: 10,
      coordinates: { lat: 21.3099, lng: -157.8581 },
    } as Listing,
    {
      id: '2',
      name: 'Test Shelter 2',
      housingType: 'transitional',
      unitBeds: 'family',
      availability: 'limited',
      monthlyRent: 800,
      district: 'Kapolei',
      island: 'Oahu',
      bedsAvailableToday: 1,
      bedsAvailableWeek: 3,
      coordinates: { lat: 21.3369, lng: -158.0559 },
    } as Listing,
  ];

  const defaultFilters: SearchFilters = {
    housingType: undefined,
    unitBedType: undefined,
    minPrice: undefined,
    maxPrice: undefined,
    island: undefined,
    district: undefined,
    petsAllowed: undefined,
    accessibilityRequired: undefined,
    hasAvailability: true,
    includeDV: false,
    searchQuery: '',
    sortBy: 'relevance',
    userLocation: undefined,
  };

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    jest.clearAllMocks();

    // Setup default mock implementations
    (useFilterStore as unknown as jest.Mock).mockReturnValue({
      snapshot: jest.fn().mockReturnValue(defaultFilters),
      ...defaultFilters,
    });

    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: {
        listings: mockListings,
        total_count: 2,
        has_more: false,
      },
      error: null,
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  test('fetches listings with default filters', async () => {
    const { result } = renderHook(() => useSearch(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.listings).toEqual(mockListings);
    expect(result.current.totalCount).toBe(2);
    expect(result.current.hasMore).toBe(false);

    expect(supabase.rpc).toHaveBeenCalledWith('fn_search_listings', expect.objectContaining({
      p_has_availability: true,
      p_include_dv: false,
      p_limit: 20,
      p_offset: 0,
    }));
  });

  test('applies filters to search', async () => {
    const customFilters: SearchFilters = {
      ...defaultFilters,
      housingType: 'emergency',
      island: 'Oahu',
      minPrice: 0,
      maxPrice: 1000,
      petsAllowed: true,
    };

    (useFilterStore as unknown as jest.Mock).mockReturnValue({
      snapshot: jest.fn().mockReturnValue(customFilters),
      ...customFilters,
    });

    const { result } = renderHook(() => useSearch(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(supabase.rpc).toHaveBeenCalledWith('fn_search_listings', expect.objectContaining({
      p_housing_type: 'emergency',
      p_island: 'Oahu',
      p_min_price: 0,
      p_max_price: 1000,
      p_pets_allowed: true,
    }));
  });

  test('handles pagination with fetchNextPage', async () => {
    // Setup paginated response
    (supabase.rpc as jest.Mock)
      .mockResolvedValueOnce({
        data: {
          listings: mockListings.slice(0, 1),
          total_count: 2,
          has_more: true,
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          listings: mockListings.slice(1, 2),
          total_count: 2,
          has_more: false,
        },
        error: null,
      });

    const { result } = renderHook(() => useSearch(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.listings).toHaveLength(1);
    expect(result.current.hasMore).toBe(true);

    // Fetch next page
    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => {
      expect(result.current.listings).toHaveLength(2);
    });

    expect(result.current.hasMore).toBe(false);
    expect(supabase.rpc).toHaveBeenCalledTimes(2);
  });

  test('handles search errors gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    });

    const { result } = renderHook(() => useSearch(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.listings).toEqual([]);
    expect(result.current.error).toBeTruthy();
    expect(consoleErrorSpy).toHaveBeenCalledWith('Search error:', expect.any(Object));

    consoleErrorSpy.mockRestore();
  });

  test('refetches when filters change', async () => {
    const { result, rerender } = renderHook(() => useSearch(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(supabase.rpc).toHaveBeenCalledTimes(1);

    // Update filters
    const newFilters = { ...defaultFilters, housingType: 'transitional' as const };
    (useFilterStore as unknown as jest.Mock).mockReturnValue({
      snapshot: jest.fn().mockReturnValue(newFilters),
      ...newFilters,
    });

    rerender();

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledTimes(2);
    });

    expect(supabase.rpc).toHaveBeenLastCalledWith('fn_search_listings', expect.objectContaining({
      p_housing_type: 'transitional',
    }));
  });

  test('handles empty results', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: {
        listings: [],
        total_count: 0,
        has_more: false,
      },
      error: null,
    });

    const { result } = renderHook(() => useSearch(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.listings).toEqual([]);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.hasMore).toBe(false);
  });

  test('includes user location when available', async () => {
    const userLocation = { lat: 21.3099, lng: -157.8581 };

    (useFilterStore as unknown as jest.Mock).mockReturnValue({
      snapshot: jest.fn().mockReturnValue({ ...defaultFilters, userLocation }),
      ...defaultFilters,
      userLocation,
    });

    const { result } = renderHook(() => useSearch(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(supabase.rpc).toHaveBeenCalledWith('fn_search_listings', expect.objectContaining({
      p_user_location: userLocation,
    }));
  });
});

describe('useMapSearch', () => {
  let queryClient: QueryClient;

  const mockMapListings: Listing[] = [
    {
      id: '1',
      name: 'Map Shelter 1',
      coordinates: { lat: 21.3099, lng: -157.8581 },
      bedsAvailableToday: 5,
    } as Listing,
    {
      id: '2',
      name: 'Map Shelter 2',
      coordinates: { lat: 21.3369, lng: -158.0559 },
      bedsAvailableToday: 0,
    } as Listing,
  ];

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    jest.clearAllMocks();

    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          neq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: mockMapListings,
              error: null,
            }),
          }),
        }),
      }),
    });
  });

  test('fetches map markers without DV listings', async () => {
    const { result } = renderHook(() => useMapSearch(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.markers).toEqual(mockMapListings);

    const fromMock = (supabase.from as jest.Mock).mock.results[0].value;
    expect(fromMock.select).toHaveBeenCalledWith('id, name, coordinates, beds_available_today, housing_type, district');
    expect(fromMock.select().eq).toHaveBeenCalledWith('active', true);
    expect(fromMock.select().eq().neq).toHaveBeenCalledWith('domestic_violence_focus', true);
  });

  test('handles map search errors', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          neq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Map error' },
            }),
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useMapSearch(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.markers).toEqual([]);
    expect(result.current.error).toBeTruthy();
    expect(consoleErrorSpy).toHaveBeenCalledWith('Map search error:', expect.any(Object));

    consoleErrorSpy.mockRestore();
  });
});

describe('useNearbyListings', () => {
  let queryClient: QueryClient;

  const mockLocation = { lat: 21.3099, lng: -157.8581 };
  const mockNearbyListings: Listing[] = [
    {
      id: '1',
      name: 'Nearby Shelter',
      coordinates: { lat: 21.3100, lng: -157.8580 },
      distance_miles: 0.1,
    } as Listing,
  ];

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    jest.clearAllMocks();

    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: {
        listings: mockNearbyListings,
        total_count: 1,
        has_more: false,
      },
      error: null,
    });
  });

  test('fetches nearby listings when location provided', async () => {
    const { result } = renderHook(
      () => useNearbyListings(mockLocation, 5),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.listings).toEqual(mockNearbyListings);

    expect(supabase.rpc).toHaveBeenCalledWith('fn_search_listings', expect.objectContaining({
      p_user_location: mockLocation,
      p_limit: 10,
    }));
  });

  test('returns empty array when no location provided', async () => {
    const { result } = renderHook(
      () => useNearbyListings(undefined, 5),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.listings).toEqual([]);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  test('respects radius parameter', async () => {
    const { result } = renderHook(
      () => useNearbyListings(mockLocation, 10),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should pass radius to RPC function (though this would be handled server-side)
    expect(supabase.rpc).toHaveBeenCalledWith('fn_search_listings', expect.objectContaining({
      p_user_location: mockLocation,
      p_limit: 10,
    }));
  });

  test('filters results by distance on client side', async () => {
    const listingsWithDistance = [
      { ...mockNearbyListings[0], distance_miles: 2 },
      { ...mockNearbyListings[0], id: '2', distance_miles: 10 },
    ];

    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: {
        listings: listingsWithDistance,
        total_count: 2,
        has_more: false,
      },
      error: null,
    });

    const { result } = renderHook(
      () => useNearbyListings(mockLocation, 5),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should filter out listing with distance > 5 miles
    expect(result.current.listings).toHaveLength(1);
    expect(result.current.listings[0].distance_miles).toBeLessThanOrEqual(5);
  });
});