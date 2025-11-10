/**
 * Unit tests for geocoding service utilities
 */

import { validateCoordinates, calculateDistance } from "./geocoding.service";
import fc from "fast-check";

describe("validateCoordinates", () => {
  test("should accept valid coordinates within bounds", () => {
    expect(validateCoordinates(34.0522, -118.2437)).toBe(true);
    expect(validateCoordinates(0, 0)).toBe(true);
    expect(validateCoordinates(-90, -180)).toBe(true);
    expect(validateCoordinates(90, 180)).toBe(true);
  });

  test("should reject latitude above 90", () => {
    expect(validateCoordinates(91, 0)).toBe(false);
    expect(validateCoordinates(100, 0)).toBe(false);
  });

  test("should reject latitude below -90", () => {
    expect(validateCoordinates(-91, 0)).toBe(false);
    expect(validateCoordinates(-100, 0)).toBe(false);
  });

  test("should reject longitude above 180", () => {
    expect(validateCoordinates(0, 181)).toBe(false);
    expect(validateCoordinates(0, 200)).toBe(false);
  });

  test("should reject longitude below -180", () => {
    expect(validateCoordinates(0, -181)).toBe(false);
    expect(validateCoordinates(0, -200)).toBe(false);
  });

  test("should accept boundary values", () => {
    expect(validateCoordinates(90, 180)).toBe(true);
    expect(validateCoordinates(-90, -180)).toBe(true);
    expect(validateCoordinates(90, -180)).toBe(true);
    expect(validateCoordinates(-90, 180)).toBe(true);
  });

  test("property: all valid lat/lng pairs should validate", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -90, max: 90, noNaN: true }),
        fc.double({ min: -180, max: 180, noNaN: true }),
        (lat, lng) => {
          expect(validateCoordinates(lat, lng)).toBe(true);
        },
      ),
    );
  });

  test("property: latitudes outside bounds should fail", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.double({ min: 90.01, max: 200, noNaN: true }),
          fc.double({ min: -200, max: -90.01, noNaN: true }),
        ),
        fc.double({ min: -180, max: 180, noNaN: true }),
        (lat, lng) => {
          expect(validateCoordinates(lat, lng)).toBe(false);
        },
      ),
    );
  });
});

describe("calculateDistance", () => {
  test("should calculate zero distance for same coordinates", () => {
    const distance = calculateDistance(34.0522, -118.2437, 34.0522, -118.2437);
    expect(distance).toBe(0);
  });

  test("should calculate distance between LA and San Francisco (~347 miles)", () => {
    const laLat = 34.0522;
    const laLng = -118.2437;
    const sfLat = 37.7749;
    const sfLng = -122.4194;

    const distance = calculateDistance(laLat, laLng, sfLat, sfLng);

    // Approximate distance is ~347 miles, allow 5 mile variance
    expect(distance).toBeGreaterThan(340);
    expect(distance).toBeLessThan(355);
  });

  test("should calculate distance between LA and New York (~2451 miles)", () => {
    const laLat = 34.0522;
    const laLng = -118.2437;
    const nyLat = 40.7128;
    const nyLng = -74.006;

    const distance = calculateDistance(laLat, laLng, nyLat, nyLng);

    // Approximate distance is ~2451 miles, allow 20 mile variance
    expect(distance).toBeGreaterThan(2430);
    expect(distance).toBeLessThan(2470);
  });

  test("should return value rounded to 1 decimal place", () => {
    const laLat = 34.0522;
    const laLng = -118.2437;
    const nearbyLat = 34.0623; // ~0.7 miles north
    const nearbyLng = -118.2437;

    const distance = calculateDistance(laLat, laLng, nearbyLat, nearbyLng);

    // Check that result has at most 1 decimal place
    const decimalPlaces = distance.toString().split(".")[1]?.length || 0;
    expect(decimalPlaces).toBeLessThanOrEqual(1);
  });

  test("should handle crossing the equator", () => {
    const distance = calculateDistance(10, 0, -10, 0);

    // ~20 degrees latitude ≈ 1380 miles
    expect(distance).toBeGreaterThan(1300);
    expect(distance).toBeLessThan(1400);
  });

  test("should handle crossing the prime meridian", () => {
    const distance = calculateDistance(0, 10, 0, -10);

    // ~20 degrees longitude at equator ≈ 1380 miles
    expect(distance).toBeGreaterThan(1300);
    expect(distance).toBeLessThan(1400);
  });

  test("property: distance should be symmetric", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -90, max: 90, noNaN: true }),
        fc.double({ min: -180, max: 180, noNaN: true }),
        fc.double({ min: -90, max: 90, noNaN: true }),
        fc.double({ min: -180, max: 180, noNaN: true }),
        (lat1, lng1, lat2, lng2) => {
          const dist1 = calculateDistance(lat1, lng1, lat2, lng2);
          const dist2 = calculateDistance(lat2, lng2, lat1, lng1);
          expect(dist1).toBe(dist2);
        },
      ),
    );
  });

  test("property: distance from point to itself should be zero", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -90, max: 90, noNaN: true }),
        fc.double({ min: -180, max: 180, noNaN: true }),
        (lat, lng) => {
          const distance = calculateDistance(lat, lng, lat, lng);
          expect(distance).toBe(0);
        },
      ),
    );
  });

  test("property: distance should always be non-negative", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -90, max: 90, noNaN: true }),
        fc.double({ min: -180, max: 180, noNaN: true }),
        fc.double({ min: -90, max: 90, noNaN: true }),
        fc.double({ min: -180, max: 180, noNaN: true }),
        (lat1, lng1, lat2, lng2) => {
          const distance = calculateDistance(lat1, lng1, lat2, lng2);
          expect(distance).toBeGreaterThanOrEqual(0);
        },
      ),
    );
  });

  test("property: triangle inequality should hold", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -90, max: 90, noNaN: true }),
        fc.double({ min: -180, max: 180, noNaN: true }),
        fc.double({ min: -90, max: 90, noNaN: true }),
        fc.double({ min: -180, max: 180, noNaN: true }),
        fc.double({ min: -90, max: 90, noNaN: true }),
        fc.double({ min: -180, max: 180, noNaN: true }),
        (lat1, lng1, lat2, lng2, lat3, lng3) => {
          const d12 = calculateDistance(lat1, lng1, lat2, lng2);
          const d23 = calculateDistance(lat2, lng2, lat3, lng3);
          const d13 = calculateDistance(lat1, lng1, lat3, lng3);

          // Triangle inequality: d13 <= d12 + d23
          // Allow small floating point error (0.1 mile)
          expect(d13).toBeLessThanOrEqual(d12 + d23 + 0.1);
        },
      ),
    );
  });
});
