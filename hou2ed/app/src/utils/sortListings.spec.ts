/**
 * Tests for sortListings utility
 */

import { sortListings, SORT_OPTIONS } from "./sortListings";
import type { Listing } from "../types/listing";

// Create mock listing with defaults
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
  unit_beds: { single_occupancy: 5, double_occupancy: 3 },
  ada_beds: 1,
  gender_rooming: "co_ed",
  amenities: {},
  accessibility: {},
  eligibility: {},
  services: {},
  rules: {},
  cost: { free: true, monthly: 0 },
  intake: {},
  availability: { beds_today: 5, beds_week: 10, waitlist: 0, last_updated_at: null },
  verified: true,
  certifications: [],
  images: [],
  responsiveness: {},
  dv_sensitive: false,
  is_active: true,
  created_at: new Date("2024-01-01").toISOString(),
  updated_at: new Date("2024-01-01").toISOString(),
  provider: {
    id: "provider-1",
    full_name: "Test Provider",
    username: "testprovider",
    is_verified: true,
  },
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

      expect(sorted[0].id).toBe("2"); // Free
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
      // Undefined distances should be last
      expect(sorted[2].distance).toBeUndefined();
      expect(sorted[3].distance).toBeUndefined();
    });
  });

  describe("newest", () => {
    test("should sort by last updated date with newest first", () => {
      const listings = [
        createMockListing({ id: "1", updated_at: new Date("2024-01-15").toISOString() }),
        createMockListing({ id: "2", updated_at: new Date("2024-03-01").toISOString() }),
        createMockListing({ id: "3", updated_at: new Date("2024-02-15").toISOString() }),
      ];

      const sorted = sortListings(listings, "newest");

      expect(sorted[0].id).toBe("2"); // March
      expect(sorted[1].id).toBe("3"); // February
      expect(sorted[2].id).toBe("1"); // January
    });
  });

  describe("rating", () => {
    test("should sort by responsiveness response_rate with highest first", () => {
      const listings = [
        createMockListing({ id: "1", responsiveness: { response_rate: 0.35 } }),
        createMockListing({ id: "2", responsiveness: { response_rate: 0.95 } }),
        createMockListing({ id: "3", responsiveness: { response_rate: 0.78 } }),
      ];

      const sorted = sortListings(listings, "rating");

      expect(sorted[0].id).toBe("2"); // 0.95
      expect(sorted[1].id).toBe("3"); // 0.78
      expect(sorted[2].id).toBe("1"); // 0.35
    });

    test("should treat undefined response_rate as 0", () => {
      const listings = [
        createMockListing({ id: "1", responsiveness: {} }),
        createMockListing({ id: "2", responsiveness: { response_rate: 0.85 } }),
        createMockListing({ id: "3", responsiveness: {} }),
      ];

      const sorted = sortListings(listings, "rating");

      expect(sorted[0].id).toBe("2");
      expect(sorted[0].responsiveness?.response_rate).toBe(0.85);
    });
  });

  describe("availability", () => {
    test("should sort by beds_today with most available first", () => {
      const listings = [
        createMockListing({ id: "1", availability: { beds_today: 0, beds_week: 0, waitlist: 5, last_updated_at: null } }),
        createMockListing({ id: "2", availability: { beds_today: 10, beds_week: 20, waitlist: 0, last_updated_at: null } }),
        createMockListing({ id: "3", availability: { beds_today: 3, beds_week: 10, waitlist: 2, last_updated_at: null } }),
        createMockListing({ id: "4", availability: { beds_today: 1, beds_week: 5, waitlist: 0, last_updated_at: null } }),
      ];

      const sorted = sortListings(listings, "availability");

      expect(sorted[0].id).toBe("2"); // 10 beds
      expect(sorted[1].id).toBe("3"); // 3 beds
      expect(sorted[2].id).toBe("4"); // 1 bed
      expect(sorted[3].id).toBe("1"); // 0 beds
    });
  });

  describe("relevance", () => {
    test("should sort by beds_today then distance", () => {
      const listings = [
        createMockListing({ id: "1", availability: { beds_today: 0, beds_week: 0, waitlist: 5, last_updated_at: null }, distance: 1.0 }),
        createMockListing({ id: "2", availability: { beds_today: 5, beds_week: 10, waitlist: 0, last_updated_at: null }, distance: 5.0 }),
        createMockListing({ id: "3", availability: { beds_today: 5, beds_week: 10, waitlist: 0, last_updated_at: null }, distance: 2.0 }),
        createMockListing({ id: "4", availability: { beds_today: 2, beds_week: 5, waitlist: 0, last_updated_at: null }, distance: 0.5 }),
      ];

      const sorted = sortListings(listings, "relevance");

      expect(sorted[0].id).toBe("3"); // 5 beds, 2.0 mi
      expect(sorted[1].id).toBe("2"); // 5 beds, 5.0 mi
      expect(sorted[2].id).toBe("4"); // 2 beds, 0.5 mi
      expect(sorted[3].id).toBe("1"); // 0 beds, 1.0 mi
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