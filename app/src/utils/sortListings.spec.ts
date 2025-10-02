/**
 * Tests for sortListings utility
 */

import { sortListings, SORT_OPTIONS } from "./sortListings";
import type { Listing } from "../types/listing";

// Create mock listing with defaults
const createMockListing = (overrides: Partial<Listing> = {}): Listing => ({
  id: "1",
  name: "Test Listing",
  type: "emergency_shelter",
  description: "Test description",
  coordinates: { latitude: 0, longitude: 0 },
  address: {
    street: "123 Test St",
    city: "Test City",
    state: "CA",
    zipCode: "12345",
  },
  price: { min: 0, max: 0, isFree: true, acceptsVouchers: false },
  availability: "available",
  bedsAvailable: 5,
  totalBeds: 10,
  amenities: [],
  requirements: [],
  features: {
    acceptsFamilies: false,
    acceptsVeterans: false,
    acceptsSingleMen: true,
    acceptsSingleWomen: true,
    petsAllowed: false,
    wheelchairAccessible: false,
    lgbtqFriendly: true,
  },
  contact: { phone: "555-0100" },
  lastUpdated: new Date("2024-01-01").toISOString(),
  provider: "Test Provider",
  verified: true,
  ...overrides,
});

describe("sortListings", () => {
  describe("priceAsc", () => {
    test("should sort by price ascending with free items first", () => {
      const listings = [
        createMockListing({ id: "1", price: { min: 500, max: 700, isFree: false, acceptsVouchers: false } }),
        createMockListing({ id: "2", price: { min: 0, max: 0, isFree: true, acceptsVouchers: false } }),
        createMockListing({ id: "3", price: { min: 200, max: 300, isFree: false, acceptsVouchers: false } }),
      ];

      const sorted = sortListings(listings, "priceAsc");

      expect(sorted[0].id).toBe("2"); // Free
      expect(sorted[1].id).toBe("3"); // $200
      expect(sorted[2].id).toBe("1"); // $500
    });

    test("should handle all free listings", () => {
      const listings = [
        createMockListing({ id: "1", price: { min: 0, max: 0, isFree: true, acceptsVouchers: false } }),
        createMockListing({ id: "2", price: { min: 0, max: 0, isFree: true, acceptsVouchers: false } }),
      ];

      const sorted = sortListings(listings, "priceAsc");
      expect(sorted.length).toBe(2);
    });
  });

  describe("priceDesc", () => {
    test("should sort by price descending", () => {
      const listings = [
        createMockListing({ id: "1", price: { min: 100, max: 200, isFree: false, acceptsVouchers: false } }),
        createMockListing({ id: "2", price: { min: 500, max: 1000, isFree: false, acceptsVouchers: false } }),
        createMockListing({ id: "3", price: { min: 250, max: 400, isFree: false, acceptsVouchers: false } }),
      ];

      const sorted = sortListings(listings, "priceDesc");

      expect(sorted[0].id).toBe("2"); // $1000 max
      expect(sorted[1].id).toBe("3"); // $400 max
      expect(sorted[2].id).toBe("1"); // $200 max
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
      // Undefined distances should be last
      expect(sorted[2].distance).toBeUndefined();
      expect(sorted[3].distance).toBeUndefined();
    });
  });

  describe("newest", () => {
    test("should sort by last updated date with newest first", () => {
      const listings = [
        createMockListing({ id: "1", lastUpdated: new Date("2024-01-15").toISOString() }),
        createMockListing({ id: "2", lastUpdated: new Date("2024-03-01").toISOString() }),
        createMockListing({ id: "3", lastUpdated: new Date("2024-02-15").toISOString() }),
      ];

      const sorted = sortListings(listings, "newest");

      expect(sorted[0].id).toBe("2"); // March
      expect(sorted[1].id).toBe("3"); // February
      expect(sorted[2].id).toBe("1"); // January
    });
  });

  describe("rating", () => {
    test("should sort by rating with highest first", () => {
      const listings = [
        createMockListing({ id: "1", rating: 3.5 }),
        createMockListing({ id: "2", rating: 4.8 }),
        createMockListing({ id: "3", rating: 4.2 }),
      ];

      const sorted = sortListings(listings, "rating");

      expect(sorted[0].id).toBe("2"); // 4.8
      expect(sorted[1].id).toBe("3"); // 4.2
      expect(sorted[2].id).toBe("1"); // 3.5
    });

    test("should treat undefined ratings as 0", () => {
      const listings = [
        createMockListing({ id: "1", rating: undefined }),
        createMockListing({ id: "2", rating: 4.5 }),
        createMockListing({ id: "3", rating: undefined }),
      ];

      const sorted = sortListings(listings, "rating");

      expect(sorted[0].id).toBe("2");
      expect(sorted[0].rating).toBe(4.5);
    });
  });

  describe("availability", () => {
    test("should sort by availability status in correct order", () => {
      const listings = [
        createMockListing({ id: "1", availability: "full" }),
        createMockListing({ id: "2", availability: "available" }),
        createMockListing({ id: "3", availability: "waitlist" }),
        createMockListing({ id: "4", availability: "unknown" }),
      ];

      const sorted = sortListings(listings, "availability");

      expect(sorted[0].availability).toBe("available");
      expect(sorted[1].availability).toBe("waitlist");
      expect(sorted[2].availability).toBe("full");
      expect(sorted[3].availability).toBe("unknown");
    });
  });

  describe("relevance", () => {
    test("should sort by availability then distance", () => {
      const listings = [
        createMockListing({ id: "1", availability: "full", distance: 1.0 }),
        createMockListing({ id: "2", availability: "available", distance: 5.0 }),
        createMockListing({ id: "3", availability: "available", distance: 2.0 }),
        createMockListing({ id: "4", availability: "waitlist", distance: 0.5 }),
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