import { sortListings, SORT_OPTIONS } from "./sortListings";
import type { Listing } from "../types/listing";

const createMockListing = (overrides: Partial<Listing> = {}): Listing => ({
  id: "1",
  provider_id: "provider-1",
  title: "Test Listing",
  description: "Test description",
  address: "123 Test St",
  city: "Test City",
  state: "CA",
  zip_code: "12345",
  lat: 0,
  lng: 0,
  housing_type: "shelter",
  unit_beds: { single_occupancy: 10 },
  ada_beds: 0,
  cost: { monthly: 0, free: true },
  availability: { beds_today: 5, beds_week: 10, waitlist: 0, last_updated_at: null },
  verified: true,
  images: [],
  dv_sensitive: false,
  is_active: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

describe("sortListings", () => {
  describe("priceAsc", () => {
    test("should sort by price ascending with free items first", () => {
      const listings = [
        createMockListing({ id: "1", cost: { monthly: 500, free: false } }),
        createMockListing({ id: "2", cost: { monthly: 0, free: true } }),
        createMockListing({ id: "3", cost: { monthly: 200, free: false } }),
      ];

      const sorted = sortListings(listings, "priceAsc");

      expect(sorted[0].id).toBe("2"); // Free ($0)
      expect(sorted[1].id).toBe("3"); // $200
      expect(sorted[2].id).toBe("1"); // $500
    });

    test("should handle all free listings", () => {
      const listings = [
        createMockListing({ id: "1", cost: { monthly: 0, free: true } }),
        createMockListing({ id: "2", cost: { monthly: 0, free: true } }),
      ];

      const sorted = sortListings(listings, "priceAsc");
      expect(sorted.length).toBe(2);
    });
  });

  describe("priceDesc", () => {
    test("should sort by price descending", () => {
      const listings = [
        createMockListing({ id: "1", cost: { monthly: 200, free: false } }),
        createMockListing({ id: "2", cost: { monthly: 1000, free: false } }),
        createMockListing({ id: "3", cost: { monthly: 400, free: false } }),
      ];

      const sorted = sortListings(listings, "priceDesc");

      expect(sorted[0].id).toBe("2"); // $1000
      expect(sorted[1].id).toBe("3"); // $400
      expect(sorted[2].id).toBe("1"); // $200
    });
  });

  describe("distance", () => {
    test("should sort by distance with closest first", () => {
      const listings = [
        createMockListing({ id: "1", distance: 5.2 }),
        createMockListing({ id: "2", distance: 1.5 }),
        createMockListing({ id: "3", distance: 3.8 }),
      ];

      const sorted = sortListings(listings, "distance");

      expect(sorted[0].id).toBe("2"); // 1.5 mi
      expect(sorted[1].id).toBe("3"); // 3.8 mi
      expect(sorted[2].id).toBe("1"); // 5.2 mi
    });

    test("should handle undefined distances as Infinity", () => {
      const listings = [
        createMockListing({ id: "1", distance: undefined }),
        createMockListing({ id: "2", distance: 2.0 }),
        createMockListing({ id: "3", distance: undefined }),
        createMockListing({ id: "4", distance: 1.0 }),
      ];

      const sorted = sortListings(listings, "distance");

      expect(sorted[0].id).toBe("4");
      expect(sorted[1].id).toBe("2");
      expect(sorted[2].distance).toBeUndefined();
      expect(sorted[3].distance).toBeUndefined();
    });
  });

  describe("newest", () => {
    test("should sort by updated_at date with newest first", () => {
      const listings = [
        createMockListing({ id: "1", updated_at: "2024-01-15T00:00:00Z" }),
        createMockListing({ id: "2", updated_at: "2024-03-01T00:00:00Z" }),
        createMockListing({ id: "3", updated_at: "2024-02-15T00:00:00Z" }),
      ];

      const sorted = sortListings(listings, "newest");

      expect(sorted[0].id).toBe("2"); // March
      expect(sorted[1].id).toBe("3"); // February
      expect(sorted[2].id).toBe("1"); // January
    });
  });

  describe("rating", () => {
    test("should return listings in original order (no rating field on Listing)", () => {
      const listings = [
        createMockListing({ id: "1" }),
        createMockListing({ id: "2" }),
        createMockListing({ id: "3" }),
      ];

      const sorted = sortListings(listings, "rating");

      expect(sorted.map((l) => l.id)).toEqual(["1", "2", "3"]);
    });
  });

  describe("availability", () => {
    test("should sort available first, then waitlist, then full", () => {
      const listings = [
        createMockListing({ id: "1", availability: { beds_today: 0, beds_week: 0, waitlist: 0, last_updated_at: null } }),
        createMockListing({ id: "2", availability: { beds_today: 5, beds_week: 10, waitlist: 0, last_updated_at: null } }),
        createMockListing({ id: "3", availability: { beds_today: 0, beds_week: 0, waitlist: 3, last_updated_at: null } }),
      ];

      const sorted = sortListings(listings, "availability");

      expect(sorted[0].id).toBe("2"); // available (beds_today > 0)
      expect(sorted[1].id).toBe("3"); // waitlist
      expect(sorted[2].id).toBe("1"); // full
    });
  });

  describe("relevance", () => {
    test("should sort by availability then distance", () => {
      const listings = [
        createMockListing({ id: "1", availability: { beds_today: 0, beds_week: 0, waitlist: 0, last_updated_at: null }, distance: 1.0 }),
        createMockListing({ id: "2", availability: { beds_today: 5, beds_week: 10, waitlist: 0, last_updated_at: null }, distance: 5.0 }),
        createMockListing({ id: "3", availability: { beds_today: 5, beds_week: 10, waitlist: 0, last_updated_at: null }, distance: 2.0 }),
        createMockListing({ id: "4", availability: { beds_today: 0, beds_week: 0, waitlist: 2, last_updated_at: null }, distance: 0.5 }),
      ];

      const sorted = sortListings(listings, "relevance");

      expect(sorted[0].id).toBe("3"); // available, 2.0 mi
      expect(sorted[1].id).toBe("2"); // available, 5.0 mi
      expect(sorted[2].id).toBe("4"); // waitlist, 0.5 mi
      expect(sorted[3].id).toBe("1"); // full, 1.0 mi
    });
  });

  describe("immutability", () => {
    test("should not modify the original array", () => {
      const listings = [
        createMockListing({ id: "1", distance: 5 }),
        createMockListing({ id: "2", distance: 1 }),
      ];
      const originalOrder = [...listings];

      sortListings(listings, "distance");

      expect(listings[0].id).toBe(originalOrder[0].id);
      expect(listings[1].id).toBe(originalOrder[1].id);
    });
  });

  describe("SORT_OPTIONS", () => {
    test("should have all expected sort options", () => {
      const expectedOptions = [
        "relevance",
        "priceAsc",
        "priceDesc",
        "distance",
        "newest",
        "rating",
        "availability",
      ];

      const actualOptions = SORT_OPTIONS.map((opt) => opt.value);
      expect(actualOptions).toEqual(expectedOptions);
    });

    test("should have labels for all options", () => {
      SORT_OPTIONS.forEach((option) => {
        expect(option.label).toBeTruthy();
        expect(typeof option.label).toBe("string");
      });
    });
  });
});
