import { getProviderListings } from "./listing.service";

jest.mock("../lib/supabase", () => {
  const chain: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({
      data: [
        {
          id: "1",
          title: "Test Home",
          address: "123 St",
          unit_beds: { shared_dorm: 3, private: 2 },
          availability: { beds_today: 4, last_updated_at: "2025-01-01T00:00:00Z" },
          updated_at: "2025-01-01T00:00:00Z",
          images: ["https://example.com/img.jpg"],
        },
      ],
      error: null,
    }),
  };

  return {
    supabase: {
      from: jest.fn().mockReturnValue(chain),
    },
  };
});

describe("getProviderListings", () => {
  it("maps Supabase rows to ProviderListing shape", async () => {
    const rows = await getProviderListings("provider-123");
    expect(rows).toHaveLength(1);
    const l = rows[0];
    expect(l).toMatchObject({
      id: "1",
      title: "Test Home",
      address: "123 St",
      totalBeds: 5,
      availableBeds: 4,
      lastUpdated: "2025-01-01T00:00:00Z",
      image: "https://example.com/img.jpg",
    });
  });
});

