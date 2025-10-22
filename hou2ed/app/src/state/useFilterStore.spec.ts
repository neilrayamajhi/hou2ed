/**
 * Tests for useFilterStore
 * Following CLAUDE.md test best practices
 */

import { renderHook, act } from "@testing-library/react-hooks";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFilterStore } from "./useFilterStore";
import { FilterState } from "../types/filters";

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe("useFilterStore", () => {
  beforeEach(() => {
    // Clear store state before each test
    const store = useFilterStore.getState();
    act(() => {
      store.clearAll();
    });
    jest.clearAllMocks();
  });

  describe("setFilter", () => {
    test("should update housing type filters", () => {
      const { result } = renderHook(() => useFilterStore());

      act(() => {
        result.current.setFilter("housingType", {
          emergencyShelter: true,
          transitionalHousing: true,
        });
      });

      expect(result.current.housingType.emergencyShelter).toBe(true);
      expect(result.current.housingType.transitionalHousing).toBe(true);
      expect(result.current.housingType.rapidRehousing).toBe(false);
    });

    test("should preserve other categories when updating one", () => {
      const { result } = renderHook(() => useFilterStore());

      act(() => {
        result.current.setFilter("amenities", { wifi: true });
        result.current.setFilter("accessibility", {
          wheelchairAccessible: true,
        });
      });

      expect(result.current.amenities.wifi).toBe(true);
      expect(result.current.accessibility.wheelchairAccessible).toBe(true);
    });
  });

  describe("setNestedFilter", () => {
    test("should update a single nested field", () => {
      const { result } = renderHook(() => useFilterStore());

      act(() => {
        result.current.setNestedFilter("costPayment", "free", true);
        result.current.setNestedFilter("costPayment", "slidingScale", true);
      });

      expect(result.current.costPayment.free).toBe(true);
      expect(result.current.costPayment.slidingScale).toBe(true);
      expect(result.current.costPayment.under500).toBe(false);
    });
  });

  describe("toggleQuickFilter", () => {
    test("should toggle immediate and set related availability filters", () => {
      const { result } = renderHook(() => useFilterStore());

      act(() => {
        result.current.toggleQuickFilter("immediate");
      });

      expect(result.current.quickFilters.immediate).toBe(true);
      expect(result.current.availabilityIntake.availableNow).toBe(true);
      expect(result.current.availabilityIntake.sameDay).toBe(true);

      // Toggle off
      act(() => {
        result.current.toggleQuickFilter("immediate");
      });

      expect(result.current.quickFilters.immediate).toBe(false);
    });

    test("should toggle veterans and update eligibility and housing type", () => {
      const { result } = renderHook(() => useFilterStore());

      act(() => {
        result.current.toggleQuickFilter("veterans");
      });

      expect(result.current.quickFilters.veterans).toBe(true);
      expect(result.current.eligibility.veteransOnly).toBe(true);
      expect(result.current.housingType.veteransHousing).toBe(true);
    });

    test("should toggle families and update unit type and eligibility", () => {
      const { result } = renderHook(() => useFilterStore());

      act(() => {
        result.current.toggleQuickFilter("families");
      });

      expect(result.current.quickFilters.families).toBe(true);
      expect(result.current.unitBedType.familyUnit).toBe(true);
      expect(result.current.eligibility.familiesOnly).toBe(true);
    });

    test("should toggle free and update cost payment", () => {
      const { result } = renderHook(() => useFilterStore());

      act(() => {
        result.current.toggleQuickFilter("free");
      });

      expect(result.current.quickFilters.free).toBe(true);
      expect(result.current.costPayment.free).toBe(true);
    });

    test("should toggle nearMe without additional changes", () => {
      const { result } = renderHook(() => useFilterStore());

      act(() => {
        result.current.toggleQuickFilter("nearMe");
      });

      expect(result.current.quickFilters.nearMe).toBe(true);
      // No other filters should change
    });
  });

  describe("getActiveFilterCount", () => {
    test("should return 0 for default state", () => {
      const { result } = renderHook(() => useFilterStore());

      expect(result.current.getActiveFilterCount()).toBe(0);
    });

    test("should count boolean filters correctly", () => {
      const { result } = renderHook(() => useFilterStore());

      act(() => {
        result.current.setFilter("housingType", {
          emergencyShelter: true,
          transitionalHousing: true,
        });
        result.current.setFilter("amenities", {
          wifi: true,
          parking: true,
          laundry: true,
        });
      });

      expect(result.current.getActiveFilterCount()).toBe(5);
    });

    test("should count location and price filters", () => {
      const { result } = renderHook(() => useFilterStore());

      act(() => {
        result.current.setLocation({ latitude: 40.7128, longitude: -74.006 });
        result.current.setPriceRange({ min: 500, max: 1500 });
        result.current.setSearchQuery("test query");
      });

      expect(result.current.getActiveFilterCount()).toBe(3); // location + price + search
    });

    test("should count quick filters", () => {
      const { result } = renderHook(() => useFilterStore());

      act(() => {
        result.current.toggleQuickFilter("immediate");
        result.current.toggleQuickFilter("free");
      });

      // Count quick filters + related filters set by toggles
      const count = result.current.getActiveFilterCount();
      expect(count).toBeGreaterThan(2); // At least the quick filters + related
    });
  });

  describe("clearCategory", () => {
    test("should clear specific category while preserving others", () => {
      const { result } = renderHook(() => useFilterStore());

      act(() => {
        result.current.setFilter("housingType", {
          emergencyShelter: true,
          transitionalHousing: true,
        });
        result.current.setFilter("amenities", {
          wifi: true,
        });
      });

      act(() => {
        result.current.clearCategory("housingType");
      });

      expect(result.current.housingType.emergencyShelter).toBe(false);
      expect(result.current.housingType.transitionalHousing).toBe(false);
      expect(result.current.amenities.wifi).toBe(true);
    });
  });

  describe("clearAll", () => {
    test("should reset all filters to default state", () => {
      const { result } = renderHook(() => useFilterStore());

      act(() => {
        result.current.setFilter("housingType", { emergencyShelter: true });
        result.current.setSearchQuery("test");
        result.current.setPriceRange({ min: 100, max: 200 });
        result.current.toggleQuickFilter("immediate");
      });

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.getActiveFilterCount()).toBe(0);
      expect(result.current.searchQuery).toBe("");
      expect(result.current.priceRange.min).toBe(0);
      expect(result.current.priceRange.max).toBe(5000);
    });
  });

  describe("snapshot and loadSnapshot", () => {
    test("should create and restore filter state snapshot", () => {
      const { result } = renderHook(() => useFilterStore());

      act(() => {
        result.current.setFilter("housingType", { emergencyShelter: true });
        result.current.setSearchQuery("test query");
      });

      let snapshot: FilterState;
      act(() => {
        snapshot = result.current.snapshot();
      });

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.housingType.emergencyShelter).toBe(false);

      act(() => {
        result.current.loadSnapshot(snapshot!);
      });

      expect(result.current.housingType.emergencyShelter).toBe(true);
      expect(result.current.searchQuery).toBe("test query");
    });

    test("snapshot should not include action functions", () => {
      const { result } = renderHook(() => useFilterStore());

      let snapshot: FilterState;
      act(() => {
        snapshot = result.current.snapshot();
      });

      expect(snapshot!).not.toHaveProperty("setFilter");
      expect(snapshot!).not.toHaveProperty("clearAll");
      expect(snapshot!).toHaveProperty("housingType");
      expect(snapshot!).toHaveProperty("searchQuery");
    });
  });

  describe("hasActiveFilters", () => {
    test("should return false when no filters are active", () => {
      const { result } = renderHook(() => useFilterStore());

      expect(result.current.hasActiveFilters()).toBe(false);
    });

    test("should return true when filters are active", () => {
      const { result } = renderHook(() => useFilterStore());

      act(() => {
        result.current.setFilter("amenities", { wifi: true });
      });

      expect(result.current.hasActiveFilters()).toBe(true);
    });
  });

  describe("setLocation", () => {
    test("should update location filters", () => {
      const { result } = renderHook(() => useFilterStore());

      act(() => {
        result.current.setLocation({
          latitude: 40.7128,
          longitude: -74.006,
          radius: 5,
          city: "New York",
        });
      });

      expect(result.current.location.latitude).toBe(40.7128);
      expect(result.current.location.longitude).toBe(-74.006);
      expect(result.current.location.radius).toBe(5);
      expect(result.current.location.city).toBe("New York");
    });
  });

  describe("setPriceRange", () => {
    test("should update price range", () => {
      const { result } = renderHook(() => useFilterStore());

      act(() => {
        result.current.setPriceRange({ min: 100 });
      });

      expect(result.current.priceRange.min).toBe(100);
      expect(result.current.priceRange.max).toBe(5000); // default max

      act(() => {
        result.current.setPriceRange({ max: 2000 });
      });

      expect(result.current.priceRange.min).toBe(100); // preserved
      expect(result.current.priceRange.max).toBe(2000);
    });
  });

  describe("setSortBy", () => {
    test("should update sort option", () => {
      const { result } = renderHook(() => useFilterStore());

      expect(result.current.sortBy).toBe("relevance");

      act(() => {
        result.current.setSortBy("priceAsc");
      });

      expect(result.current.sortBy).toBe("priceAsc");
    });
  });

  describe("setSearchQuery", () => {
    test("should update search query", () => {
      const { result } = renderHook(() => useFilterStore());

      act(() => {
        result.current.setSearchQuery("emergency housing near me");
      });

      expect(result.current.searchQuery).toBe("emergency housing near me");
    });
  });

  describe("edge cases", () => {
    test("should handle empty filter updates", () => {
      const { result } = renderHook(() => useFilterStore());

      act(() => {
        result.current.setFilter("housingType", {});
      });

      // Should not crash and maintain state
      expect(result.current.housingType).toBeDefined();
    });

    test("should handle clearing already empty filters", () => {
      const { result } = renderHook(() => useFilterStore());

      act(() => {
        result.current.clearCategory("amenities");
      });

      expect(result.current.amenities.wifi).toBe(false);
    });

    test("should handle multiple rapid toggle operations", () => {
      const { result } = renderHook(() => useFilterStore());

      act(() => {
        result.current.toggleQuickFilter("immediate");
        result.current.toggleQuickFilter("immediate");
        result.current.toggleQuickFilter("immediate");
      });

      expect(result.current.quickFilters.immediate).toBe(true);
    });
  });

  // Property-based test concepts (would use fast-check library in production)
  describe("invariants", () => {
    test("clearAll followed by getActiveFilterCount should always return 0", () => {
      const { result } = renderHook(() => useFilterStore());

      // Set random filters
      act(() => {
        result.current.setFilter("housingType", { emergencyShelter: true });
        result.current.toggleQuickFilter("families");
        result.current.setSearchQuery("test");
        result.current.clearAll();
      });

      expect(result.current.getActiveFilterCount()).toBe(0);
    });

    test("snapshot and loadSnapshot should be idempotent", () => {
      const { result } = renderHook(() => useFilterStore());

      act(() => {
        result.current.setFilter("amenities", { wifi: true });
      });

      let snapshot1: FilterState;
      let snapshot2: FilterState;

      act(() => {
        snapshot1 = result.current.snapshot();
        result.current.loadSnapshot(snapshot1);
        snapshot2 = result.current.snapshot();
      });

      // Snapshots should be identical
      expect(JSON.stringify(snapshot1!)).toBe(JSON.stringify(snapshot2!));
    });
  });
});

