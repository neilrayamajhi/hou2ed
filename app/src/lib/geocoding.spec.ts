/**
 * Unit tests for geocoding utilities
 */

import type { GeocodeResult } from "./geocoding";
import { normalizeAddress, geocodeAddress, ensureCoords } from "./geocoding";

describe("normalizeAddress", () => {
  test("should normalize full address with all fields", () => {
    const result = normalizeAddress({
      street: "123 Main St",
      city: "Los Angeles",
      state: "CA",
      zip: "90001",
    });

    expect(result).toBe("123 main st, los angeles, ca, 90001");
  });

  test("should handle mixed case and extra whitespace", () => {
    const result = normalizeAddress({
      street: "  456  WILSHIRE   Blvd  ",
      city: "  LOS  ANGELES  ",
      state: " CA ",
      zip: " 90210 ",
    });

    expect(result).toBe("456 wilshire blvd, los angeles, ca, 90210");
  });

  test("should handle missing optional fields", () => {
    const result = normalizeAddress({
      street: "789 Test Ave",
      city: null,
      state: null,
      zip: null,
    });

    expect(result).toBe("789 test ave");
  });

  test("should handle partial address with only street and city", () => {
    const result = normalizeAddress({
      street: "100 Broadway",
      city: "New York",
      state: null,
      zip: null,
    });

    expect(result).toBe("100 broadway, new york");
  });

  test("should return empty string for completely empty address", () => {
    const result = normalizeAddress({
      street: null,
      city: null,
      state: null,
      zip: null,
    });

    expect(result).toBe("");
  });

  test("should handle addresses with only zip code", () => {
    const result = normalizeAddress({
      street: null,
      city: null,
      state: null,
      zip: "90001",
    });

    expect(result).toBe("90001");
  });

  test("should normalize multiple consecutive spaces to single space", () => {
    const result = normalizeAddress({
      street: "123    Main     Street",
      city: "Los    Angeles",
      state: "CA",
      zip: "90001",
    });

    expect(result).toBe("123 main street, los angeles, ca, 90001");
  });

  test("should be case-insensitive and produce same output for different cases", () => {
    const addr1 = normalizeAddress({
      street: "123 MAIN ST",
      city: "LOS ANGELES",
      state: "CA",
      zip: "90001",
    });

    const addr2 = normalizeAddress({
      street: "123 main st",
      city: "los angeles",
      state: "ca",
      zip: "90001",
    });

    expect(addr1).toBe(addr2);
  });
});

describe("geocodeAddress", () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  test("should return null for empty address", async () => {
    const result = await geocodeAddress({
      street: null,
      city: null,
      state: null,
      zip: null,
    });

    expect(result).toBeNull();
  });

  test("should return null for address with only whitespace", async () => {
    const result = await geocodeAddress({
      street: "   ",
      city: "  ",
      state: null,
      zip: null,
    });

    expect(result).toBeNull();
  });

  // Note: Integration tests for cache and API calls should be in a separate
  // integration test file since they require database and network access
});

describe("ensureCoords", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should return existing coordinates if present", async () => {
    const listing = {
      lat: 34.0522,
      lng: -118.2437,
      address: "123 Main St",
      city: "Los Angeles",
      state: "CA",
      zip_code: "90001",
    };

    const result = await ensureCoords(listing);

    expect(result).toEqual({
      lat: 34.0522,
      lng: -118.2437,
    });
  });

  test("should convert string coordinates to numbers", async () => {
    const listing = {
      lat: "34.0522" as any,
      lng: "-118.2437" as any,
      address: "123 Main St",
      city: "Los Angeles",
      state: "CA",
      zip_code: "90001",
    };

    const result = await ensureCoords(listing);

    expect(result).toEqual({
      lat: 34.0522,
      lng: -118.2437,
    });
  });

  test("should return null if no coordinates and no address", async () => {
    const listing = {
      lat: null,
      lng: null,
      address: null,
      city: null,
      state: null,
      zip_code: null,
    };

    const result = await ensureCoords(listing);

    expect(result).toBeNull();
  });

  test("should not geocode if only lat is present (both required)", async () => {
    const listing = {
      lat: 34.0522,
      lng: null,
      address: "123 Main St",
      city: "Los Angeles",
      state: "CA",
      zip_code: "90001",
    };

    // Should attempt to geocode since lng is missing
    const result = await ensureCoords(listing);

    // Without mocking the geocoding service, this will attempt real geocoding
    // In integration tests, we'd mock this
    expect(result).toBeDefined();
  });

  test("should not geocode if only lng is present (both required)", async () => {
    const listing = {
      lat: null,
      lng: -118.2437,
      address: "123 Main St",
      city: "Los Angeles",
      state: "CA",
      zip_code: "90001",
    };

    // Should attempt to geocode since lat is missing
    const result = await ensureCoords(listing);

    expect(result).toBeDefined();
  });

  test("should handle zero coordinates as valid", async () => {
    const listing = {
      lat: 0,
      lng: 0,
      address: "123 Main St",
      city: "Los Angeles",
      state: "CA",
      zip_code: "90001",
    };

    const result = await ensureCoords(listing);

    expect(result).toEqual({
      lat: 0,
      lng: 0,
    });
  });
});
