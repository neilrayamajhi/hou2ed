import {
  listAllListingsForAdmin,
  getListingForAdmin,
  setListingActive,
} from "./listingModeration.service";
import { supabase } from "../lib/supabase";

jest.mock("../lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

function makeQuery(result: {
  data?: any;
  error: { message: string } | null;
}) {
  const query: any = {
    select: jest.fn(() => query),
    order: jest.fn(() => query),
    eq: jest.fn(() => query),
    ilike: jest.fn(() => query),
    update: jest.fn(() => query),
    maybeSingle: jest.fn(() => Promise.resolve(result)),
    then: (resolve: (value: typeof result) => void) => resolve(result),
  };
  return query;
}

const LISTING_ROW = {
  id: "l1",
  title: "Sunny Apartment",
  city: "Boston",
  housing_type: "shelter",
  is_active: true,
  verified: true,
  provider_id: "p1",
  created_at: "2026-01-01T00:00:00.000Z",
};

describe("listAllListingsForAdmin", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("maps listing rows into admin summaries", async () => {
    (supabase.from as jest.Mock).mockReturnValue(
      makeQuery({ data: [LISTING_ROW], error: null }),
    );

    const result = await listAllListingsForAdmin();

    expect(result).toEqual([
      {
        id: "l1",
        title: "Sunny Apartment",
        city: "Boston",
        housingType: "shelter",
        isActive: true,
        verified: true,
        providerId: "p1",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
  });

  test("defaults a null verified flag to false", async () => {
    (supabase.from as jest.Mock).mockReturnValue(
      makeQuery({ data: [{ ...LISTING_ROW, verified: null }], error: null }),
    );

    const result = await listAllListingsForAdmin();

    expect(result[0].verified).toBe(false);
  });

  test("throws a descriptive error when the query fails", async () => {
    (supabase.from as jest.Mock).mockReturnValue(
      makeQuery({ data: null, error: { message: "connection refused" } }),
    );

    await expect(listAllListingsForAdmin()).rejects.toThrow(
      "Failed to load listings: connection refused",
    );
  });
});

describe("getListingForAdmin", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns full listing detail", async () => {
    (supabase.from as jest.Mock).mockReturnValue(
      makeQuery({
        data: {
          ...LISTING_ROW,
          description: "A great place",
          address: "1 Main St",
          state: "MA",
          zip_code: "02101",
        },
        error: null,
      }),
    );

    const result = await getListingForAdmin("l1");

    expect(result).toEqual({
      id: "l1",
      title: "Sunny Apartment",
      city: "Boston",
      housingType: "shelter",
      isActive: true,
      verified: true,
      providerId: "p1",
      createdAt: "2026-01-01T00:00:00.000Z",
      description: "A great place",
      address: "1 Main St",
      state: "MA",
      zipCode: "02101",
    });
  });

  test("throws when the listing does not exist", async () => {
    (supabase.from as jest.Mock).mockReturnValue(
      makeQuery({ data: null, error: null }),
    );

    await expect(getListingForAdmin("missing")).rejects.toThrow(
      "listing not found",
    );
  });
});

describe("setListingActive", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns success on a clean update", async () => {
    (supabase.from as jest.Mock).mockReturnValue(makeQuery({ error: null }));

    const result = await setListingActive("l1", false);

    expect(result).toEqual({ success: true });
  });

  test("returns the error message when the update is rejected", async () => {
    (supabase.from as jest.Mock).mockReturnValue(
      makeQuery({ error: { message: "permission denied" } }),
    );

    const result = await setListingActive("l1", false);

    expect(result).toEqual({ success: false, error: "permission denied" });
  });
});
