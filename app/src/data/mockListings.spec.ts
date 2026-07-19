import type { Listing } from "../types/listing";
import { filterListingsByQuick } from "./mockListings";

const BASE_LISTING: Listing = {
  id: "test-1",
  provider_id: "provider-1",
  title: "Test Shelter",
  description: "A test shelter",
  address: "123 Main St",
  city: "Honolulu",
  state: "HI",
  zip_code: "96813",
  lat: 21.3099,
  lng: -157.8581,
  housing_type: "shelter",
  unit_beds: { single_occupancy: 10 },
  ada_beds: 0,
  gender_rooming: "co_ed",
  eligibility: { veterans: false, family_status: [] },
  cost: { monthly: 500, free: false },
  availability: { beds_today: 5, beds_week: 10, waitlist: 0, last_updated_at: null },
  verified: true,
  images: [],
  dv_sensitive: false,
  is_active: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const NO_FILTERS = {
  immediate: false,
  free: false,
  veterans: false,
  families: false,
  nearMe: false,
};

describe("filterListingsByQuick", () => {
  test("returns all listings when no filters are active", () => {
    const listings = [BASE_LISTING, { ...BASE_LISTING, id: "test-2" }];
    expect(filterListingsByQuick(listings, NO_FILTERS)).toEqual(listings);
  });

  test("returns empty array for empty input", () => {
    expect(filterListingsByQuick([], NO_FILTERS)).toEqual([]);
  });

  describe("immediate filter", () => {
    test("keeps only listings with beds_today > 0", () => {
      const withBeds = { ...BASE_LISTING, id: "has-beds", availability: { ...BASE_LISTING.availability, beds_today: 3 } };
      const noBeds = { ...BASE_LISTING, id: "no-beds", availability: { ...BASE_LISTING.availability, beds_today: 0 } };
      expect(filterListingsByQuick([withBeds, noBeds], { ...NO_FILTERS, immediate: true })).toEqual([withBeds]);
    });
  });

  describe("free filter", () => {
    test("keeps only listings with cost.free === true", () => {
      const free = { ...BASE_LISTING, id: "free", cost: { monthly: 0, free: true } };
      const paid = { ...BASE_LISTING, id: "paid", cost: { monthly: 500, free: false } };
      expect(filterListingsByQuick([free, paid], { ...NO_FILTERS, free: true })).toEqual([free]);
    });
  });

  describe("veterans filter", () => {
    test("keeps only listings with eligibility.veterans === true", () => {
      const vet = { ...BASE_LISTING, id: "vet", eligibility: { veterans: true, family_status: [] } };
      const nonVet = { ...BASE_LISTING, id: "non-vet", eligibility: { veterans: false, family_status: [] } };
      expect(filterListingsByQuick([vet, nonVet], { ...NO_FILTERS, veterans: true })).toEqual([vet]);
    });
  });

  describe("families filter", () => {
    test("keeps listings with family_status containing 'families'", () => {
      const familyListing = { ...BASE_LISTING, id: "families", eligibility: { family_status: ["families"] } };
      const noFamily = { ...BASE_LISTING, id: "no-family", eligibility: { family_status: [] } };
      expect(filterListingsByQuick([familyListing, noFamily], { ...NO_FILTERS, families: true })).toEqual([familyListing]);
    });

    test("does NOT match listings with 'family' (singular) — the DB stores 'families'", () => {
      const singular = { ...BASE_LISTING, id: "singular", eligibility: { family_status: ["family"] } };
      expect(filterListingsByQuick([singular], { ...NO_FILTERS, families: true })).toEqual([]);
    });
  });

  describe("nearMe filter", () => {
    test("keeps listings with distance < 2 miles", () => {
      const close = { ...BASE_LISTING, id: "close", distance: 1.5 };
      const far = { ...BASE_LISTING, id: "far", distance: 3.0 };
      const noDistance = { ...BASE_LISTING, id: "no-dist", distance: undefined };
      expect(filterListingsByQuick([close, far, noDistance], { ...NO_FILTERS, nearMe: true })).toEqual([close, noDistance]);
    });
  });

  describe("housingTypeFilter", () => {
    test("keeps only listings matching selected housing type", () => {
      const shelter = { ...BASE_LISTING, id: "shelter", housing_type: "shelter" as const };
      const transitional = { ...BASE_LISTING, id: "transitional", housing_type: "transitional" as const };
      expect(
        filterListingsByQuick([shelter, transitional], NO_FILTERS, { shelter: true }),
      ).toEqual([shelter]);
    });

    test("returns all listings when no housing type is selected", () => {
      const listings = [BASE_LISTING, { ...BASE_LISTING, id: "test-2" }];
      expect(filterListingsByQuick(listings, NO_FILTERS, { shelter: false })).toEqual(listings);
    });

    test("applies housing type AND quick filter simultaneously", () => {
      const freeShelter = { ...BASE_LISTING, id: "free-shelter", housing_type: "shelter" as const, cost: { free: true } };
      const paidShelter = { ...BASE_LISTING, id: "paid-shelter", housing_type: "shelter" as const, cost: { free: false } };
      const freeTransitional = { ...BASE_LISTING, id: "free-trans", housing_type: "transitional" as const, cost: { free: true } };
      expect(
        filterListingsByQuick([freeShelter, paidShelter, freeTransitional], { ...NO_FILTERS, free: true }, { shelter: true }),
      ).toEqual([freeShelter]);
    });
  });
});
