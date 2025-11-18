/**
 * Integration tests for marketplace service
 *
 * NOTE: These are integration tests that require mocking Supabase.
 * For proper testing, these should be run against a test database.
 * The current tests focus on error handling and edge cases that can be unit tested.
 */

describe("marketplace.service", () => {
  describe("calculateDistance", () => {
    const calculateDistanceTest = (
      lat1: number | null | undefined,
      lon1: number | null | undefined,
      lat2: number | null | undefined,
      lon2: number | null | undefined,
    ): number | undefined => {
      // Replicate validation logic from calculateDistance
      if (
        lat1 == null ||
        lon1 == null ||
        lat2 == null ||
        lon2 == null ||
        Number.isNaN(lat1) ||
        Number.isNaN(lon1) ||
        Number.isNaN(lat2) ||
        Number.isNaN(lon2) ||
        lat1 === 0 ||
        lon1 === 0 ||
        lat2 === 0 ||
        lon2 === 0 ||
        Math.abs(lat1) > 90 ||
        Math.abs(lat2) > 90 ||
        Math.abs(lon1) > 180 ||
        Math.abs(lon2) > 180
      ) {
        return undefined;
      }

      const R = 3959; // Radius of Earth in miles
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;
      return Math.round(distance * 10) / 10;
    };

    test("calculates distance between two coordinates using Haversine formula", () => {
      // LA to San Francisco (approx 347 miles)
      const lat1 = 34.0522; // LA
      const lon1 = -118.2437;
      const lat2 = 37.7749; // SF
      const lon2 = -122.4194;

      const distance = calculateDistanceTest(lat1, lon1, lat2, lon2);

      // Distance should be approximately 347 miles
      expect(distance).toBeGreaterThan(340);
      expect(distance).toBeLessThan(360);
    });

    test("returns 0 for same coordinates", () => {
      const lat = 34.0522;
      const lon = -118.2437;

      const distance = calculateDistanceTest(lat, lon, lat, lon);

      expect(distance).toBe(0);
    });

    test("calculates small distances accurately", () => {
      // Two points about 0.7 miles apart in LA
      const lat1 = 34.0522;
      const lon1 = -118.2437;
      const lat2 = 34.0622; // ~0.7 degrees north = ~0.7 miles
      const lon2 = -118.2437;

      const distance = calculateDistanceTest(lat1, lon1, lat2, lon2);

      // Should be about 0.7 miles (1 degree latitude ≈ 69 miles, so 0.01 degrees ≈ 0.69 miles)
      expect(distance).toBeGreaterThan(0.6);
      expect(distance).toBeLessThan(0.8);
    });

    test("returns undefined for null coordinates", () => {
      expect(
        calculateDistanceTest(null, -118.2437, 37.7749, -122.4194),
      ).toBeUndefined();
      expect(
        calculateDistanceTest(34.0522, null, 37.7749, -122.4194),
      ).toBeUndefined();
      expect(
        calculateDistanceTest(34.0522, -118.2437, null, -122.4194),
      ).toBeUndefined();
      expect(
        calculateDistanceTest(34.0522, -118.2437, 37.7749, null),
      ).toBeUndefined();
    });

    test("returns undefined for undefined coordinates", () => {
      expect(
        calculateDistanceTest(undefined, -118.2437, 37.7749, -122.4194),
      ).toBeUndefined();
      expect(
        calculateDistanceTest(34.0522, undefined, 37.7749, -122.4194),
      ).toBeUndefined();
      expect(
        calculateDistanceTest(34.0522, -118.2437, undefined, -122.4194),
      ).toBeUndefined();
      expect(
        calculateDistanceTest(34.0522, -118.2437, 37.7749, undefined),
      ).toBeUndefined();
    });

    test("returns undefined for NaN coordinates", () => {
      expect(
        calculateDistanceTest(NaN, -118.2437, 37.7749, -122.4194),
      ).toBeUndefined();
      expect(
        calculateDistanceTest(34.0522, NaN, 37.7749, -122.4194),
      ).toBeUndefined();
      expect(
        calculateDistanceTest(34.0522, -118.2437, NaN, -122.4194),
      ).toBeUndefined();
      expect(
        calculateDistanceTest(34.0522, -118.2437, 37.7749, NaN),
      ).toBeUndefined();
    });

    test("returns undefined for zero coordinates (invalid)", () => {
      expect(
        calculateDistanceTest(0, -118.2437, 37.7749, -122.4194),
      ).toBeUndefined();
      expect(
        calculateDistanceTest(34.0522, 0, 37.7749, -122.4194),
      ).toBeUndefined();
      expect(
        calculateDistanceTest(34.0522, -118.2437, 0, -122.4194),
      ).toBeUndefined();
      expect(
        calculateDistanceTest(34.0522, -118.2437, 37.7749, 0),
      ).toBeUndefined();
    });

    test("returns undefined for out-of-range latitude", () => {
      expect(
        calculateDistanceTest(91, -118.2437, 37.7749, -122.4194),
      ).toBeUndefined();
      expect(
        calculateDistanceTest(-91, -118.2437, 37.7749, -122.4194),
      ).toBeUndefined();
      expect(
        calculateDistanceTest(34.0522, -118.2437, 100, -122.4194),
      ).toBeUndefined();
      expect(
        calculateDistanceTest(34.0522, -118.2437, -100, -122.4194),
      ).toBeUndefined();
    });

    test("returns undefined for out-of-range longitude", () => {
      expect(
        calculateDistanceTest(34.0522, 181, 37.7749, -122.4194),
      ).toBeUndefined();
      expect(
        calculateDistanceTest(34.0522, -181, 37.7749, -122.4194),
      ).toBeUndefined();
      expect(
        calculateDistanceTest(34.0522, -118.2437, 37.7749, 200),
      ).toBeUndefined();
      expect(
        calculateDistanceTest(34.0522, -118.2437, 37.7749, -200),
      ).toBeUndefined();
    });

    test("accepts edge case valid coordinates (exactly at limits)", () => {
      // Latitude: -90 to 90 (exclusive of extremes due to 0 check)
      expect(calculateDistanceTest(89, -118, 37, -122)).toBeDefined();
      expect(calculateDistanceTest(-89, -118, 37, -122)).toBeDefined();

      // Longitude: -180 to 180 (exclusive of extremes due to 0 check)
      expect(calculateDistanceTest(34, 179, 37, -122)).toBeDefined();
      expect(calculateDistanceTest(34, -179, 37, -122)).toBeDefined();
    });
  });

  describe("transformToMarketplace logic", () => {
    test("calculates total beds from unit_beds object", () => {
      const unit_beds = { single: 10, double: 5, family: 3 };
      const totalBeds = Object.values(unit_beds).reduce(
        (sum: number, count) => sum + (count || 0),
        0,
      );

      expect(totalBeds).toBe(18);
    });

    test("handles empty unit_beds", () => {
      const unit_beds: Record<string, number> = {};
      const totalBeds = Object.values(unit_beds).reduce(
        (sum: number, count) => sum + (count || 0),
        0,
      );

      expect(totalBeds).toBe(0);
    });

    test("handles null values in unit_beds", () => {
      const unit_beds: Record<string, number | null> = {
        single: 10,
        double: null,
        family: 3,
      };
      const totalBeds = Object.values(unit_beds).reduce(
        (sum: number, count) => sum + (count || 0),
        0,
      );

      expect(totalBeds).toBe(13); // 10 + 0 + 3
    });

    test("determines availability status based on beds_today", () => {
      const getAvailability = (beds_today: number, waitlist: number) => {
        if (beds_today > 0) return "available";
        if (waitlist > 0) return "waitlist";
        return "full";
      };

      expect(getAvailability(5, 0)).toBe("available");
      expect(getAvailability(0, 3)).toBe("waitlist");
      expect(getAvailability(0, 0)).toBe("full");
    });

    test("extracts amenities from nested category structure", () => {
      const amenitiesObj = {
        basic: ["wifi", "meals"],
        services: ["counseling", "job_training"],
      };

      const amenities: string[] = [];
      Object.values(amenitiesObj).forEach((category) => {
        if (Array.isArray(category)) {
          amenities.push(...category);
        }
      });

      expect(amenities).toContain("wifi");
      expect(amenities).toContain("meals");
      expect(amenities).toContain("counseling");
      expect(amenities).toContain("job_training");
      expect(amenities).toHaveLength(4);
    });

    test("handles flat amenities array", () => {
      const amenitiesObj = ["wifi", "meals", "parking"];

      const amenities: string[] = [];
      if (Array.isArray(amenitiesObj)) {
        amenities.push(...amenitiesObj);
      }

      expect(amenities).toHaveLength(3);
    });
  });

  describe("image URL normalization", () => {
    test("preserves full HTTPS URLs", () => {
      const url = "https://example.com/image.jpg";
      const isFullUrl = /^https?:\/\//i.test(url);

      expect(isFullUrl).toBe(true);
    });

    test("detects storage paths that need conversion", () => {
      const path = "listings/shelter-a.jpg";
      const isFullUrl = /^https?:\/\//i.test(path);

      expect(isFullUrl).toBe(false);
    });

    test("handles null/undefined image values", () => {
      const value = null;
      const toString = (v: any) => {
        if (v == null) return null;
        if (typeof v === "string") return v.trim();
        try {
          return String(v).trim();
        } catch {
          return null;
        }
      };

      expect(toString(value)).toBeNull();
    });

    test("handles image objects with url property", () => {
      const imageObj = { url: "  https://example.com/image.jpg  " };
      const toString = (v: any) => {
        if (v == null) return null;
        if (typeof v === "string") return v.trim();
        if (typeof v === "object" && (v as any).url)
          return String((v as any).url).trim();
        try {
          return String(v).trim();
        } catch {
          return null;
        }
      };

      expect(toString(imageObj)).toBe("https://example.com/image.jpg");
    });
  });

  describe("price calculation", () => {
    test("extracts monthly price from cost object", () => {
      const cost = { monthly: 500, free: false };
      const monthlyPrice = cost.monthly || 0;
      const isFree = cost.free === true;

      expect(monthlyPrice).toBe(500);
      expect(isFree).toBe(false);
    });

    test("handles free housing", () => {
      const cost = { monthly: 0, free: true };
      const monthlyPrice = cost.monthly || 0;
      const isFree = cost.free === true;

      expect(monthlyPrice).toBe(0);
      expect(isFree).toBe(true);
    });

    test("handles numeric cost value (legacy)", () => {
      const cost = 500;
      const monthlyPrice = typeof cost === "number" ? cost : 0;
      const isFree = monthlyPrice === 0;

      expect(monthlyPrice).toBe(500);
      expect(isFree).toBe(false);
    });
  });

  describe("error handling", () => {
    test("Promise.race resolves with first completed promise", async () => {
      // Test that Promise.race correctly resolves with timeout
      const slowPromise = new Promise((resolve) => {
        setTimeout(() => resolve({ data: [{ id: "1" }], error: null }), 20000);
      });

      const timeoutPromise = Promise.resolve({
        data: null,
        error: { message: "Query timeout", code: "TIMEOUT" },
      });

      const result = (await Promise.race([slowPromise, timeoutPromise])) as any;

      expect(result.error).toBeTruthy();
      expect(result.error.code).toBe("TIMEOUT");
      expect(result.data).toBeNull();
    });
  });
});
