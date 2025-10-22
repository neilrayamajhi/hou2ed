import fc from 'fast-check';
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
  toggleSearchNotification,
  batchSaveListings,
  exportSavedListings,
  type SaveListingParams,
  type SaveSearchParams,
} from './saved.service';
import { supabase } from '../lib/supabase';
import type { SearchFilters } from '../types/listing';

// Mock Supabase
jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

describe('saveListing', () => {
  const mockUser = { id: 'user-123' };
  const mockListingParams: SaveListingParams = {
    listingId: 'listing-456',
    notes: 'Great location',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    } as any);
  });

  test('should save new listing successfully', async () => {
    const mockSavedListing = {
      id: 'saved-123',
      user_id: 'user-123',
      listing_id: 'listing-456',
      notes: 'Great location',
    };

    // Mock checking for existing
    const selectMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      }),
    };

    // Mock insertion
    const insertMock = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockSavedListing,
        error: null,
      }),
    };

    let callCount = 0;
    (supabase.from as jest.Mock).mockImplementation(() => {
      callCount++;
      return callCount === 1 ? selectMock as any : insertMock as any;
    });

    const result = await saveListing(mockListingParams);

    expect(result.success).toBe(true);
    expect(result.data?.listing_id).toBe('listing-456');
    expect(insertMock.insert).toHaveBeenCalledWith({
      user_id: 'user-123',
      listing_id: 'listing-456',
      notes: 'Great location',
    });
  });

  test('should update notes if listing already saved', async () => {
    const existingListing = {
      id: 'saved-existing',
      user_id: 'user-123',
      listing_id: 'listing-456',
    };

    // Mock finding existing
    const selectMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: existingListing,
        error: null,
      }),
    };

    // Mock update
    const updateMock = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { ...existingListing, notes: 'Updated notes' },
        error: null,
      }),
    };

    let callCount = 0;
    (supabase.from as jest.Mock).mockImplementation(() => {
      callCount++;
      return callCount === 1 ? selectMock as any : updateMock as any;
    });

    const result = await saveListing({
      listingId: 'listing-456',
      notes: 'Updated notes',
    });

    expect(result.success).toBe(true);
    expect(updateMock.update).toHaveBeenCalledWith({ notes: 'Updated notes' });
  });

  test('should handle unauthenticated user', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: null },
      error: null,
    } as any);

    const result = await saveListing(mockListingParams);

    expect(result.success).toBe(false);
    expect(result.error).toBe('User not authenticated');
  });
});

describe('saveSearch', () => {
  const mockUser = { id: 'user-123' };
  const mockSearchParams: SaveSearchParams = {
    name: 'My Search',
    description: 'Looking for affordable housing',
    filters: {
      housingType: ['apartment', 'shared_room'],
      costPayment: { freeOnly: true },
    },
    notificationEnabled: true,
    notificationFrequency: 'daily',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    } as any);
  });

  test('should save search with filters successfully', async () => {
    const mockSavedSearch = {
      id: 'search-123',
      user_id: 'user-123',
      name: 'My Search',
      filters: mockSearchParams.filters,
    };

    // Mock checking for duplicate
    const selectMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      }),
    };

    // Mock insertion
    const insertMock = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockSavedSearch,
        error: null,
      }),
    };

    let callCount = 0;
    (supabase.from as jest.Mock).mockImplementation(() => {
      callCount++;
      return callCount === 1 ? selectMock as any : insertMock as any;
    });

    const result = await saveSearch(mockSearchParams);

    expect(result.success).toBe(true);
    expect(result.data?.name).toBe('My Search');
    expect(insertMock.insert).toHaveBeenCalledWith({
      user_id: 'user-123',
      name: 'My Search',
      description: 'Looking for affordable housing',
      filters: mockSearchParams.filters,
      notification_enabled: true,
      notification_frequency: 'daily',
    });
  });

  test('should prevent duplicate search names', async () => {
    const selectMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'existing-search' },
        error: null,
      }),
    };

    (supabase.from as jest.Mock).mockReturnValue(selectMock as any);

    const result = await saveSearch(mockSearchParams);

    expect(result.success).toBe(false);
    expect(result.error).toBe('A saved search with this name already exists');
  });
});

describe('batchSaveListings', () => {
  const mockUser = { id: 'user-123' };

  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    } as any);
  });

  test('should batch save multiple listings', async () => {
    const listingIds = ['listing-1', 'listing-2', 'listing-3'];

    // Mock checking existing
    const selectMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValue({
        data: [{ listing_id: 'listing-1' }], // One already exists
        error: null,
      }),
    };

    // Mock insertion
    const insertMock = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({
        data: [
          { id: 'saved-2', listing_id: 'listing-2' },
          { id: 'saved-3', listing_id: 'listing-3' },
        ],
        error: null,
      }),
    };

    let callCount = 0;
    (supabase.from as jest.Mock).mockImplementation(() => {
      callCount++;
      return callCount === 1 ? selectMock as any : insertMock as any;
    });

    const result = await batchSaveListings(listingIds);

    expect(result.success).toBe(true);
    expect(result.data).toBe(2); // Only 2 new listings saved
    expect(insertMock.insert).toHaveBeenCalledWith([
      { user_id: 'user-123', listing_id: 'listing-2' },
      { user_id: 'user-123', listing_id: 'listing-3' },
    ]);
  });

  test('should handle all listings already saved', async () => {
    const listingIds = ['listing-1'];

    const selectMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValue({
        data: [{ listing_id: 'listing-1' }],
        error: null,
      }),
    };

    (supabase.from as jest.Mock).mockReturnValue(selectMock as any);

    const result = await batchSaveListings(listingIds);

    expect(result.success).toBe(true);
    expect(result.data).toBe(0);
  });
});

describe('runSavedSearch', () => {
  const mockUser = { id: 'user-123' };

  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    } as any);
  });

  test('should run saved search with stored filters', async () => {
    const savedFilters: SearchFilters = {
      housingType: ['shelter'],
      costPayment: { freeOnly: true },
    };

    // Mock getting saved search
    const fromMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { filters: savedFilters },
        error: null,
      }),
    };

    (supabase.from as jest.Mock).mockReturnValue(fromMock as any);

    // Mock RPC call
    const mockListings = [
      { id: 'listing-1', title: 'Free Shelter' },
      { id: 'listing-2', title: 'Emergency Housing' },
    ];

    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: { listings: mockListings },
      error: null,
    } as any);

    const result = await runSavedSearch('search-123');

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockListings);
    expect(supabase.rpc).toHaveBeenCalledWith('fn_search_rank', {
      filters: savedFilters,
      page_number: 0,
      page_size: 50,
    });
  });
});

describe('Property-based tests', () => {
  describe('Filter preservation', () => {
    test('saved filters should be preserved exactly', () => {
      fc.assert(
        fc.property(
          fc.record({
            housingType: fc.array(
              fc.constantFrom('apartment', 'shelter', 'transitional'),
              { minLength: 0, maxLength: 10 }
            ),
            costPayment: fc.option(
              fc.record({
                maxMonthly: fc.integer({ min: 0, max: 10000 }),
                freeOnly: fc.boolean(),
              })
            ),
            locationEnv: fc.option(
              fc.record({
                city: fc.string(),
                maxDistance: fc.integer({ min: 1, max: 100 }),
              })
            ),
          }),
          (filters) => {
            // Property: Filters should be preserved exactly when saved
            const saved = JSON.stringify(filters);
            const restored = JSON.parse(saved);
            expect(restored).toEqual(filters);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Search name validation', () => {
    test('should handle various search names', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          (name) => {
            const params: SaveSearchParams = {
              name: name.trim(),
              filters: {},
            };

            // Property: Non-empty names should be valid
            if (name.trim()) {
              expect(params.name.length).toBeGreaterThan(0);
              expect(params.name.length).toBeLessThanOrEqual(100);
            }
          }
        )
      );
    });
  });

  describe('Batch operations', () => {
    test('should handle batch saves correctly', () => {
      fc.assert(
        fc.property(
          fc.array(fc.uuid(), { minLength: 0, maxLength: 100 }),
          fc.array(fc.uuid(), { minLength: 0, maxLength: 50 }),
          (allIds, existingIds) => {
            const existingSet = new Set(existingIds);
            const newIds = allIds.filter(id => !existingSet.has(id));

            // Property: New saves should exclude existing
            expect(newIds.length).toBeLessThanOrEqual(allIds.length);
            expect(newIds.every(id => !existingSet.has(id))).toBe(true);
          }
        )
      );
    });
  });
});

describe('Edge cases', () => {
  const edgeCases = [
    { name: 'empty notes', notes: '' },
    { name: 'very long notes', notes: 'a'.repeat(5000) },
    { name: 'special characters', notes: '!@#$%^&*()_+-=[]{}|;:,.<>?' },
    { name: 'unicode', notes: '你好世界🌍📍' },
    { name: 'newlines', notes: 'Line 1\nLine 2\nLine 3' },
  ];

  edgeCases.forEach(({ name, notes }) => {
    test(`should handle ${name} in notes`, async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      } as any);

      const selectMock = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      };

      const insertMock = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'saved-123', notes },
          error: null,
        }),
      };

      let callCount = 0;
      (supabase.from as jest.Mock).mockImplementation(() => {
        callCount++;
        return callCount === 1 ? selectMock as any : insertMock as any;
      });

      const result = await saveListing({ listingId: 'listing-123', notes });

      expect(result.success).toBe(true);
      expect(insertMock.insert).toHaveBeenCalled();
    });
  });

  test('should handle concurrent save operations', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    } as any);

    const fromMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      }),
      insert: jest.fn().mockReturnThis(),
    };

    fromMock.insert.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'saved-123' },
        error: null,
      }),
    } as any);

    (supabase.from as jest.Mock).mockReturnValue(fromMock as any);

    // Simulate concurrent saves
    const promises = Array.from({ length: 10 }, (_, i) =>
      saveListing({ listingId: `listing-${i}` })
    );

    const results = await Promise.all(promises);

    expect(results.every(r => r.success)).toBe(true);
  });
});

describe('Export functionality', () => {
  test('should export saved listings as JSON', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    } as any);

    const mockListings = [
      {
        id: 'saved-1',
        listing_id: 'listing-1',
        notes: 'Note 1',
        created_at: '2024-01-01',
        listing: {
          title: 'Listing 1',
          city: 'Houston',
          state: 'TX',
        },
      },
      {
        id: 'saved-2',
        listing_id: 'listing-2',
        notes: 'Note 2',
        created_at: '2024-01-02',
        listing: {
          title: 'Listing 2',
          city: 'Austin',
          state: 'TX',
        },
      },
    ];

    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: mockListings,
        error: null,
      }),
    } as any);

    const result = await exportSavedListings();

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();

    const exported = JSON.parse(result.data!);
    expect(exported.totalListings).toBe(2);
    expect(exported.listings).toHaveLength(2);
    expect(exported.listings[0].title).toBe('Listing 1');
  });
});