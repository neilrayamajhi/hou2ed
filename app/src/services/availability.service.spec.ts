import fc from "fast-check";
import {
  updateAvailability,
  confirmAvailability,
  getAvailabilityHistory,
  batchUpdateAvailability,
  getListingsNeedingConfirmation,
  getAvailabilityStats,
  type AvailabilityUpdate,
  type AvailabilityResult,
} from "./availability.service";

// Mock Supabase
jest.mock("../lib/supabase", () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

import { supabase } from "../lib/supabase";

describe("updateAvailability", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should update availability with all fields", async () => {
    const update: AvailabilityUpdate = {
      listingId: "listing-123",
      bedsToday: 5,
      bedsWeek: 10,
      waitlistDays: 7,
    };

    const mockResult: AvailabilityResult = {
      success: true,
      message: "Availability updated successfully",
      data: {
        listing_id: "listing-123",
        beds_today: 5,
        beds_week: 10,
        waitlist_days: 7,
        last_confirmed: "2025-01-03T12:00:00Z",
        changes: [
          { field: "beds_today", from: 3, to: 5 },
          { field: "beds_week", from: 8, to: 10 },
        ],
      },
    };

    (supabase.rpc as jest.Mock).mockResolvedValueOnce({
      data: mockResult,
      error: null,
    } as any);

    const result = await updateAvailability(update);

    expect(supabase.rpc).toHaveBeenCalledWith("fn_update_availability", {
      p_listing_id: "listing-123",
      p_beds_today: 5,
      p_beds_week: 10,
      p_waitlist_days: 7,
      p_confirm_only: false,
    });
    expect(result).toEqual(mockResult);
  });

  test("should handle partial updates", async () => {
    const update: AvailabilityUpdate = {
      listingId: "listing-456",
      bedsToday: 3,
    };

    const mockResult: AvailabilityResult = {
      success: true,
      data: {
        listing_id: "listing-456",
        beds_today: 3,
        beds_week: 5,
        waitlist_days: 14,
        last_confirmed: "2025-01-03T12:00:00Z",
        changes: [{ field: "beds_today", from: 1, to: 3 }],
      },
    };

    (supabase.rpc as jest.Mock).mockResolvedValueOnce({
      data: mockResult,
      error: null,
    } as any);

    const result = await updateAvailability(update);

    expect(supabase.rpc).toHaveBeenCalledWith("fn_update_availability", {
      p_listing_id: "listing-456",
      p_beds_today: 3,
      p_beds_week: null,
      p_waitlist_days: null,
      p_confirm_only: false,
    });
    expect(result).toEqual(mockResult);
  });

  test("should handle RPC errors", async () => {
    const update: AvailabilityUpdate = {
      listingId: "invalid-listing",
      bedsToday: 5,
    };

    (supabase.rpc as jest.Mock).mockResolvedValueOnce({
      data: null,
      error: { message: "Listing not found" },
    } as any);

    const result = await updateAvailability(update);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Listing not found");
  });

  test("should handle unexpected errors", async () => {
    const update: AvailabilityUpdate = {
      listingId: "listing-789",
      bedsToday: 5,
    };

    (supabase.rpc as jest.Mock).mockRejectedValueOnce(
      new Error("Network error"),
    );

    const result = await updateAvailability(update);

    expect(result.success).toBe(false);
    expect(result.error).toBe("An unexpected error occurred");
  });
});

describe("confirmAvailability", () => {
  test("should confirm availability without changes", async () => {
    const mockResult: AvailabilityResult = {
      success: true,
      message: "Availability confirmed",
      data: {
        listing_id: "listing-123",
        beds_today: 5,
        beds_week: 10,
        waitlist_days: 7,
        last_confirmed: "2025-01-03T12:00:00Z",
        confirmed_at: "2025-01-03T12:00:00Z",
      },
    };

    (supabase.rpc as jest.Mock).mockResolvedValueOnce({
      data: mockResult,
      error: null,
    } as any);

    const result = await confirmAvailability("listing-123");

    expect(supabase.rpc).toHaveBeenCalledWith("fn_update_availability", {
      p_listing_id: "listing-123",
      p_beds_today: null,
      p_beds_week: null,
      p_waitlist_days: null,
      p_confirm_only: true,
    });
    expect(result).toEqual(mockResult);
  });
});

describe("getAvailabilityHistory", () => {
  test("should fetch availability history", async () => {
    const mockHistory = [
      {
        id: "history-1",
        listing_id: "listing-123",
        provider_id: "provider-456",
        beds_available_today: 5,
        beds_available_this_week: 10,
        waitlist_days: 7,
        change_type: "updated",
        changes: [{ field: "beds_today", from: 3, to: 5 }],
        notes: "Provider updated availability",
        created_at: "2025-01-03T12:00:00Z",
      },
      {
        id: "history-2",
        listing_id: "listing-123",
        provider_id: "provider-456",
        beds_available_today: 3,
        beds_available_this_week: 10,
        waitlist_days: 7,
        change_type: "confirmed",
        changes: [],
        notes: "Provider confirmed no changes to availability",
        created_at: "2025-01-02T12:00:00Z",
      },
    ];

    const fromMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValueOnce({
        data: mockHistory,
        error: null,
      }),
    };

    (supabase.from as jest.Mock).mockReturnValueOnce(fromMock as any);

    const result = await getAvailabilityHistory("listing-123", 50);

    expect(supabase.from).toHaveBeenCalledWith("availability_history");
    expect(fromMock.eq).toHaveBeenCalledWith("listing_id", "listing-123");
    expect(fromMock.order).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
    expect(fromMock.limit).toHaveBeenCalledWith(50);
    expect(result).toEqual(mockHistory);
  });

  test("should handle errors gracefully", async () => {
    const fromMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValueOnce({
        data: null,
        error: { message: "Database error" },
      }),
    };

    (supabase.from as jest.Mock).mockReturnValueOnce(fromMock as any);

    const result = await getAvailabilityHistory("listing-123");

    expect(result).toEqual([]);
  });
});

describe("batchUpdateAvailability", () => {
  test("should update multiple listings", async () => {
    const updates: AvailabilityUpdate[] = [
      { listingId: "listing-1", bedsToday: 5 },
      { listingId: "listing-2", bedsWeek: 10 },
      { listingId: "listing-3", confirmOnly: true },
    ];

    const mockResults: AvailabilityResult[] = [
      {
        success: true,
        data: {
          listing_id: "listing-1",
          beds_today: 5,
          beds_week: 0,
          waitlist_days: 0,
          last_confirmed: "2025-01-03T12:00:00Z",
        },
      },
      {
        success: true,
        data: {
          listing_id: "listing-2",
          beds_today: 0,
          beds_week: 10,
          waitlist_days: 0,
          last_confirmed: "2025-01-03T12:00:00Z",
        },
      },
      {
        success: true,
        data: {
          listing_id: "listing-3",
          beds_today: 3,
          beds_week: 5,
          waitlist_days: 7,
          last_confirmed: "2025-01-03T12:00:00Z",
        },
      },
    ];

    (supabase.rpc as jest.Mock)
      .mockResolvedValueOnce({ data: mockResults[0], error: null } as any)
      .mockResolvedValueOnce({ data: mockResults[1], error: null } as any)
      .mockResolvedValueOnce({ data: mockResults[2], error: null } as any);

    const results = await batchUpdateAvailability(updates);

    expect(results).toEqual(mockResults);
    expect(supabase.rpc).toHaveBeenCalledTimes(3);
  });

  test("should handle partial failures", async () => {
    const updates: AvailabilityUpdate[] = [
      { listingId: "listing-1", bedsToday: 5 },
      { listingId: "invalid-listing", bedsWeek: 10 },
    ];

    (supabase.rpc as jest.Mock)
      .mockResolvedValueOnce({ data: { success: true }, error: null } as any)
      .mockResolvedValueOnce({
        data: null,
        error: { message: "Not found" },
      } as any);

    const results = await batchUpdateAvailability(updates);

    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(false);
    expect(results[1].error).toBe("Not found");
  });
});

describe("getListingsNeedingConfirmation", () => {
  // listings.provider_id is the provider's own auth id directly - there is
  // no separate "providers" table to look up first (see the fix comment in
  // availability.service.ts for why the old implementation always returned
  // an empty array against the live schema).
  test("should fetch listings needing confirmation for the given provider", async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
      data: { user: { id: "user-123" } },
    } as any);

    const listingsFromMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      lt: jest.fn().mockResolvedValueOnce({
        data: [
          {
            id: "listing-1",
            name: "Property A",
            last_confirmed: "2024-12-20T12:00:00Z",
          },
          {
            id: "listing-2",
            name: "Property B",
            last_confirmed: "2024-12-15T12:00:00Z",
          },
        ],
        error: null,
      }),
    };

    (supabase.from as jest.Mock).mockReturnValueOnce(listingsFromMock as any);

    const result = await getListingsNeedingConfirmation(7);

    expect(listingsFromMock.eq).toHaveBeenCalledWith("provider_id", "user-123");
    expect(result).toHaveLength(2);
    expect(result[0].days_since_confirmation).toBeGreaterThan(7);
    expect(result[1].days_since_confirmation).toBeGreaterThan(7);
  });

  test("should return empty array when no user id is available", async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
      data: { user: null },
    } as any);

    const result = await getListingsNeedingConfirmation();

    expect(result).toEqual([]);
  });
});

describe("getAvailabilityStats", () => {
  test("should calculate availability statistics", async () => {
    const mockHistory = [
      {
        id: "h1",
        change_type: "updated",
        changes: [
          { field: "beds_today", from: 3, to: 5 },
          { field: "beds_week", from: 8, to: 10 },
        ],
        created_at: "2025-01-03T12:00:00Z",
      },
      {
        id: "h2",
        change_type: "confirmed",
        changes: [],
        created_at: "2025-01-02T12:00:00Z",
      },
      {
        id: "h3",
        change_type: "updated",
        changes: [{ field: "beds_today", from: 5, to: 3 }],
        created_at: "2025-01-01T12:00:00Z",
      },
    ];

    const fromMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValueOnce({
        data: mockHistory,
        error: null,
      }),
    };

    (supabase.from as jest.Mock).mockReturnValueOnce(fromMock as any);

    const result = await getAvailabilityStats("listing-123", 30);

    expect(result.totalUpdates).toBe(2);
    expect(result.totalConfirmations).toBe(1);
    expect(result.averageBedsTodayChange).toBeGreaterThan(0);
    expect(result.lastUpdate).toBe("2025-01-03T12:00:00Z");
  });

  test("should handle empty history", async () => {
    const fromMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValueOnce({
        data: [],
        error: null,
      }),
    };

    (supabase.from as jest.Mock).mockReturnValueOnce(fromMock as any);

    const result = await getAvailabilityStats("listing-123");

    expect(result.totalUpdates).toBe(0);
    expect(result.totalConfirmations).toBe(0);
    expect(result.averageBedsTodayChange).toBe(0);
    expect(result.lastUpdate).toBeNull();
  });
});

// Property-based tests
describe("availability service properties", () => {
  test("updateAvailability should handle non-negative bed counts", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.nat({ max: 100 }),
        fc.nat({ max: 100 }),
        fc.nat({ max: 365 }),
        async (listingId, bedsToday, bedsWeek, waitlistDays) => {
          (supabase.rpc as jest.Mock).mockResolvedValueOnce({
            data: {
              success: true,
              data: {
                listing_id: listingId,
                beds_today: bedsToday,
                beds_week: bedsWeek,
                waitlist_days: waitlistDays,
                last_confirmed: new Date().toISOString(),
              },
            },
            error: null,
          } as any);

          const result = await updateAvailability({
            listingId,
            bedsToday,
            bedsWeek,
            waitlistDays,
          });

          expect(result.success).toBe(true);
          expect(result.data?.beds_today).toBe(bedsToday);
          expect(result.data?.beds_week).toBe(bedsWeek);
          expect(result.data?.waitlist_days).toBe(waitlistDays);
        },
      ),
      { numRuns: 10 },
    );
  });

  test("batchUpdateAvailability should maintain order", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            listingId: fc.string({ minLength: 1 }),
            bedsToday: fc.option(fc.nat({ max: 100 }), { nil: undefined }),
            bedsWeek: fc.option(fc.nat({ max: 100 }), { nil: undefined }),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        async (updates) => {
          // Mock successful responses for each update
          updates.forEach((update, index) => {
            (supabase.rpc as jest.Mock).mockResolvedValueOnce({
              data: {
                success: true,
                data: {
                  listing_id: update.listingId,
                  beds_today: update.bedsToday ?? 0,
                  beds_week: update.bedsWeek ?? 0,
                  waitlist_days: 0,
                  last_confirmed: new Date().toISOString(),
                },
              },
              error: null,
            } as any);
          });

          const results = await batchUpdateAvailability(updates);

          expect(results).toHaveLength(updates.length);
          results.forEach((result, index) => {
            expect(result.data?.listing_id).toBe(updates[index].listingId);
          });
        },
      ),
      { numRuns: 10 },
    );
  });

  test("availability stats should handle various history patterns", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            change_type: fc.constantFrom("updated", "confirmed", "created"),
            changes: fc.array(
              fc.record({
                field: fc.constantFrom(
                  "beds_today",
                  "beds_week",
                  "waitlist_days",
                ),
                from: fc.nat({ max: 100 }),
                to: fc.nat({ max: 100 }),
              }),
              { maxLength: 3 },
            ),
            created_at: fc.date({
              min: new Date("2024-01-01"),
              max: new Date(),
            }),
          }),
          { minLength: 0, maxLength: 50 },
        ),
        async (history) => {
          const fromMock = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValueOnce({
              data: history.map((h, i) => ({
                ...h,
                id: `history-${i}`,
                created_at: h.created_at.toISOString(),
              })),
              error: null,
            }),
          };

          (supabase.from as jest.Mock).mockReturnValueOnce(fromMock as any);

          const result = await getAvailabilityStats("test-listing", 365);

          const expectedUpdates = history.filter(
            (h) => h.change_type === "updated",
          ).length;
          const expectedConfirmations = history.filter(
            (h) => h.change_type === "confirmed",
          ).length;

          expect(result.totalUpdates).toBe(expectedUpdates);
          expect(result.totalConfirmations).toBe(expectedConfirmations);
          expect(result.averageBedsTodayChange).toBeGreaterThanOrEqual(0);
          expect(result.averageBedsWeekChange).toBeGreaterThanOrEqual(0);
        },
      ),
      { numRuns: 10 },
    );
  });

  // Edge case tests
  test("should handle SQL injection attempts in listing ID", async () => {
    const maliciousId = "'; DROP TABLE listings; --";

    (supabase.rpc as jest.Mock).mockResolvedValueOnce({
      data: { success: false, error: "Invalid input" },
      error: null,
    } as any);

    const result = await updateAvailability({
      listingId: maliciousId,
      bedsToday: 5,
    });

    expect(result.success).toBe(false);
    // RPC function should safely handle the input
    expect(supabase.rpc).toHaveBeenCalledWith("fn_update_availability", {
      p_listing_id: maliciousId,
      p_beds_today: 5,
      p_beds_week: null,
      p_waitlist_days: null,
      p_confirm_only: false,
    });
  });

  test("should handle extremely large numbers gracefully", async () => {
    const update: AvailabilityUpdate = {
      listingId: "listing-123",
      bedsToday: Number.MAX_SAFE_INTEGER,
      bedsWeek: Number.MAX_SAFE_INTEGER,
      waitlistDays: Number.MAX_SAFE_INTEGER,
    };

    (supabase.rpc as jest.Mock).mockResolvedValueOnce({
      data: { success: false, error: "Invalid bed count" },
      error: null,
    } as any);

    const result = await updateAvailability(update);

    expect(result.success).toBe(false);
  });

  test("should handle concurrent updates correctly", async () => {
    const updates = Array.from({ length: 5 }, (_, i) => ({
      listingId: `listing-${i}`,
      bedsToday: i * 2,
    }));

    updates.forEach((_, i) => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            listing_id: `listing-${i}`,
            beds_today: i * 2,
            beds_week: 0,
            waitlist_days: 0,
            last_confirmed: new Date().toISOString(),
          },
        },
        error: null,
      } as any);
    });

    const results = await Promise.all(
      updates.map((update) => updateAvailability(update)),
    );

    expect(results).toHaveLength(5);
    results.forEach((result, i) => {
      expect(result.success).toBe(true);
      expect(result.data?.beds_today).toBe(i * 2);
    });
  });
});
