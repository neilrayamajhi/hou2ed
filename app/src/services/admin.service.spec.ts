import { getAdminStats, getAdminAnalytics } from "./admin.service";
import { supabase } from "../lib/supabase";

jest.mock("../lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Builds a chainable query mock that resolves to { count, error } regardless
// of which filter methods (.eq/.gte) are chained on it, mirroring how the
// real supabase-js query builder resolves when awaited.
function makeCountQuery(
  count: number | null,
  error: { message: string } | null = null,
) {
  const query: any = {
    eq: jest.fn(() => query),
    gte: jest.fn(() => query),
    then: (resolve: (value: { count: number | null; error: any }) => void) =>
      resolve({ count, error }),
  };
  return query;
}

describe("getAdminStats", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns counts for each stat keyed by table and filter", async () => {
    const countsByTable: Record<string, number> = {
      profiles: 7,
      listings: 3,
      blocks: 1,
    };

    (supabase.from as jest.Mock).mockImplementation((table: string) => ({
      select: jest.fn(() => makeCountQuery(countsByTable[table])),
    }));

    const stats = await getAdminStats();

    expect(stats).toEqual({
      totalSeekers: 7,
      totalProviders: 7,
      activeListings: 3,
      newSignupsThisWeek: 7,
      recentBlocks: 1,
    });
  });

  test("treats a null count as zero", async () => {
    (supabase.from as jest.Mock).mockImplementation(() => ({
      select: jest.fn(() => makeCountQuery(null)),
    }));

    const stats = await getAdminStats();

    expect(stats).toEqual({
      totalSeekers: 0,
      totalProviders: 0,
      activeListings: 0,
      newSignupsThisWeek: 0,
      recentBlocks: 0,
    });
  });

  test("throws a descriptive error when a query fails", async () => {
    (supabase.from as jest.Mock).mockImplementation((table: string) => ({
      select: jest.fn(() =>
        table === "listings"
          ? makeCountQuery(null, { message: "connection refused" })
          : makeCountQuery(5),
      ),
    }));

    await expect(getAdminStats()).rejects.toThrow(
      "Failed to count active listings: connection refused",
    );
  });
});

// Builds a chainable query mock that resolves to { data, error }, mirroring
// how the real supabase-js query builder resolves when awaited.
function makeRowsQuery(
  data: any[] | null,
  error: { message: string } | null = null,
) {
  const query: any = {
    gte: jest.fn(() => query),
    then: (resolve: (value: { data: any[] | null; error: any }) => void) =>
      resolve({ data, error }),
  };
  return query;
}

describe("getAdminAnalytics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("aggregates raw rows into trends and breakdowns", async () => {
    const now = new Date("2026-06-06T00:00:00.000Z");
    jest.useFakeTimers().setSystemTime(now);

    const signupAt = "2026-06-02T00:00:00.000Z";
    const rowsByTable: Record<string, any[]> = {
      profiles: [
        { created_at: signupAt, role: "seeker" },
        { created_at: signupAt, role: "seeker" },
        { created_at: signupAt, role: "provider" },
      ],
      listings: [
        {
          created_at: "2026-06-02T00:00:00.000Z",
          city: "Boston",
          housing_type: "shelter",
          verified: true,
        },
        {
          created_at: "2026-06-02T00:00:00.000Z",
          city: "Boston",
          housing_type: "transitional",
          verified: false,
        },
      ],
      applications: [
        { status: "new" },
        { status: "approved" },
        { status: "new" },
      ],
    };

    (supabase.from as jest.Mock).mockImplementation((table: string) => ({
      select: jest.fn(() => makeRowsQuery(rowsByTable[table] ?? [])),
    }));

    const analytics = await getAdminAnalytics();

    expect(analytics.roleSplit).toEqual([
      { key: "seeker", count: 2 },
      { key: "provider", count: 1 },
    ]);
    expect(analytics.listingsByCity).toEqual([{ key: "Boston", count: 2 }]);
    expect(analytics.listingsByHousingType).toEqual([
      { key: "shelter", count: 1 },
      { key: "transitional", count: 1 },
    ]);
    expect(analytics.listingsByVerification).toEqual([
      { key: "Verified", count: 1 },
      { key: "Unverified", count: 1 },
    ]);
    expect(analytics.applicationsByStatus).toEqual([
      { key: "new", count: 2 },
      { key: "approved", count: 1 },
    ]);
    // All rows dated 2026-06-02 fall in the most recent weekly bucket
    const lastBucket = (trend: typeof analytics.listingsTrend) =>
      trend[trend.length - 1].count;
    expect(lastBucket(analytics.listingsTrend)).toBe(2);
    expect(analytics.listingsTrend.reduce((sum, b) => sum + b.count, 0)).toBe(
      2,
    );
    expect(lastBucket(analytics.signupsTrend)).toBe(3);
    expect(analytics.signupsTrend.reduce((sum, b) => sum + b.count, 0)).toBe(3);

    jest.useRealTimers();
  });

  test("throws a descriptive error when a query fails", async () => {
    (supabase.from as jest.Mock).mockImplementation((table: string) => ({
      select: jest.fn(() =>
        table === "applications"
          ? makeRowsQuery(null, { message: "connection refused" })
          : makeRowsQuery([]),
      ),
    }));

    await expect(getAdminAnalytics()).rejects.toThrow(
      "Failed to load applications: connection refused",
    );
  });
});
