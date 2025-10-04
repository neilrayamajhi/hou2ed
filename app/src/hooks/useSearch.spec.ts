import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useSearch, useInfiniteSearch, useListing, useMapSearch, useNearbyListings } from './useSearch';
import { supabase } from '../lib/supabase';
import { useFilterStore } from '../state/useFilterStore';
import type { SearchFilters, LocationBounds } from '../types/listing';

// Mock Supabase
jest.mock('../lib/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(),
  },
}));

// Mock filter store
jest.mock('../state/useFilterStore', () => ({
  useFilterStore: jest.fn((selector) => {
    const state = {
      snapshot: () => ({
        housingType: ['shelter', 'transitional'],
        costPayment: { freeOnly: true },
      }),
    };
    return selector ? selector(state) : state;
  }),
}));

describe('useSearch', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  test('should fetch search results with default filters', async () => {
    const mockResponse = {
      listings: [
        {
          id: '1',
          title: 'Test Shelter',
          relevance_score: 85,
          score_reasons: ['Available beds', 'Good match'],
          distance_miles: 2.5,
        },
      ],
      total_count: 1,
      has_more: false,
    };

    (supabase.rpc as jest.Mock).mockResolvedValueOnce({
      data: mockResponse,
      error: null,
    } as any);

    const { result } = renderHook(() => useSearch(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      listings: [
        {
          id: '1',
          title: 'Test Shelter',
          relevance_score: 85,
          score: 85,
          reasons: ['Available beds', 'Good match'],
          distance: 2.5,
        },
      ],
      totalCount: 1,
      hasMore: false,
      page: 0,
    });

    expect(supabase.rpc).toHaveBeenCalledWith('fn_search_rank', {
      filters: {
        housing_type: ['shelter', 'transitional'],
        cost: { freeOnly: true },
      },
      bounds: null,
      sort_by: 'relevance',
      page_number: 0,
      page_size: 20,
      show_stale: false,
    });
  });

  test('should handle search errors gracefully', async () => {
    const mockError = new Error('Search failed');
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({
      data: null,
      error: mockError,
    } as any);

    const { result } = renderHook(() => useSearch(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });

  test('should handle empty search results', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({
      data: {
        listings: [],
        total_count: 0,
        has_more: false,
      },
      error: null,
    } as any);

    const { result } = renderHook(() => useSearch(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      listings: [],
      totalCount: 0,
      hasMore: false,
      page: 0,
    });
  });

  test('should handle malformed RPC response', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({
      data: null,
      error: null,
    } as any);

    const { result } = renderHook(() => useSearch(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      listings: [],
      totalCount: 0,
      hasMore: false,
      page: 0,
    });
  });

  test('should apply custom search parameters', async () => {
    const customFilters: SearchFilters = {
      housingType: ['apartment'],
      costPayment: { maxMonthly: 500 },
    };

    const customParams = {
      filters: customFilters,
      sortBy: 'cost' as const,
      page: 1,
      limit: 10,
    };

    (supabase.rpc as jest.Mock).mockResolvedValueOnce({
      data: { listings: [], total_count: 0, has_more: false },
      error: null,
    } as any);

    renderHook(() => useSearch(customParams), { wrapper });

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('fn_search_rank', {
        filters: {
          housing_type: ['apartment'],
          cost: { maxMonthly: 500 },
        },
        bounds: null,
        sort_by: 'cost',
        page_number: 1,
        page_size: 10,
        show_stale: false,
      });
    });
  });
});

describe('useInfiniteSearch', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  test('should handle pagination correctly', async () => {
    const page1Response = {
      listings: [{ id: '1', relevance_score: 90 }],
      total_count: 2,
      has_more: true,
    };

    const page2Response = {
      listings: [{ id: '2', relevance_score: 85 }],
      total_count: 2,
      has_more: false,
    };

    (supabase.rpc as jest.Mock)
      .mockResolvedValueOnce({ data: page1Response, error: null } as any)
      .mockResolvedValueOnce({ data: page2Response, error: null } as any);

    const { result } = renderHook(() => useInfiniteSearch(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.pages).toHaveLength(1);
    expect(result.current.hasNextPage).toBe(true);

    // Fetch next page
    await result.current.fetchNextPage();

    await waitFor(() => {
      expect(result.current.data?.pages).toHaveLength(2);
      expect(result.current.hasNextPage).toBe(false);
    });
  });
});

describe('useListing', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  test('should fetch a single listing by ID', async () => {
    const mockListing = {
      id: 'test-id',
      title: 'Test Listing',
      provider: {
        id: 'provider-1',
        full_name: 'John Doe',
        username: 'johndoe',
        is_verified: true,
      },
    };

    const fromMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: mockListing,
        error: null,
      }),
    };

    (supabase.from as jest.Mock).mockReturnValue(fromMock as any);

    const { result } = renderHook(() => useListing('test-id'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockListing);
    expect(supabase.from).toHaveBeenCalledWith('listings');
    expect(fromMock.eq).toHaveBeenCalledWith('id', 'test-id');
  });

  test('should not fetch if ID is empty', () => {
    const { result } = renderHook(() => useListing(''), { wrapper });

    expect(result.current.isIdle).toBe(true);
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

describe('useMapSearch', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  test('should search within map bounds', async () => {
    const bounds: LocationBounds = {
      north: 30.0,
      south: 29.0,
      east: -95.0,
      west: -96.0,
    };

    (supabase.rpc as jest.Mock).mockResolvedValueOnce({
      data: { listings: [], total_count: 0, has_more: false },
      error: null,
    } as any);

    const { result } = renderHook(() => useMapSearch(bounds), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(supabase.rpc).toHaveBeenCalledWith('fn_search_rank', {
      filters: expect.any(Object),
      bounds: {
        north: 30.0,
        south: 29.0,
        east: -95.0,
        west: -96.0,
      },
      sort_by: 'relevance',
      page_number: 0,
      page_size: 20,
      show_stale: false,
    });
  });

  test('should not search without bounds', () => {
    const { result } = renderHook(() => useMapSearch(null), { wrapper });

    expect(result.current.isIdle).toBe(true);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});

describe('useNearbyListings', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  test('should fetch nearby listings based on coordinates', async () => {
    const mockNearbyListings = [
      { id: '1', distance_miles: 0.5 },
      { id: '2', distance_miles: 1.2 },
    ];

    (supabase.rpc as jest.Mock).mockResolvedValueOnce({
      data: mockNearbyListings,
      error: null,
    } as any);

    const { result } = renderHook(
      () => useNearbyListings(29.7604, -95.3698, 3, 5),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockNearbyListings);
    expect(supabase.rpc).toHaveBeenCalledWith('fn_nearby_listings', {
      user_lat: 29.7604,
      user_lng: -95.3698,
      radius_miles: 3,
      max_results: 5,
    });
  });

  test('should use default radius and limit', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({
      data: [],
      error: null,
    } as any);

    renderHook(() => useNearbyListings(29.7604, -95.3698), { wrapper });

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('fn_nearby_listings', {
        user_lat: 29.7604,
        user_lng: -95.3698,
        radius_miles: 5,
        max_results: 10,
      });
    });
  });

  test('should not fetch without coordinates', () => {
    const { result } = renderHook(() => useNearbyListings(0, 0), { wrapper });

    expect(result.current.isIdle).toBe(true);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});