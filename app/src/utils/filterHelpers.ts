/**
 * Filter store helper utilities for reducing complexity
 */

import { FilterState } from "../types/filters";

/**
 * Quick filter strategy mapping
 */
export const QUICK_FILTER_STRATEGIES = {
  immediate: (state: FilterState) => ({
    availabilityIntake: {
      ...state.availabilityIntake,
      availableNow: true,
      sameDay: true,
    },
  }),

  free: (state: FilterState) => ({
    costPayment: {
      ...state.costPayment,
      free: true,
    },
  }),

  veterans: (state: FilterState) => ({
    eligibility: {
      ...state.eligibility,
      veteransOnly: true,
    },
    housingType: {
      ...state.housingType,
      veteransHousing: true,
    },
  }),

  families: (state: FilterState) => ({
    unitBedType: {
      ...state.unitBedType,
      familyUnit: true,
    },
    eligibility: {
      ...state.eligibility,
      familiesOnly: true,
    },
  }),

  nearMe: () => ({}), // Handled separately with location
} as const;

/**
 * Categories to count for active filters
 */
export const BOOLEAN_FILTER_CATEGORIES = [
  "housingType",
  "unitBedType",
  "amenities",
  "accessibility",
  "roomDetails",
  "eligibility",
  "supportPrograms",
  "costPayment",
  "locationEnv",
  "rulesRequirements",
  "availabilityIntake",
  "providerQuality",
  "communityLifestyle",
  "advanced",
  "quickFilters",
] as const;

/**
 * Count active boolean filters in an object
 */
export function countBooleanFilters(obj: Record<string, any>): number {
  return Object.values(obj).filter((value) => value === true).length;
}

/**
 * Count all active filters in the state
 */
export function countAllActiveFilters(state: FilterState): number {
  // Count boolean filters using reduce
  const booleanCount = BOOLEAN_FILTER_CATEGORIES.reduce(
    (sum, category) =>
      sum + countBooleanFilters(state[category] as Record<string, any>),
    0,
  );

  // Count other filter types
  let additionalCount = 0;

  if (state.searchQuery) additionalCount++;
  if (state.location.latitude && state.location.longitude) additionalCount++;
  if (state.location.zipCode) additionalCount++;
  if (state.location.city) additionalCount++;
  if (state.priceRange.min > 0 || state.priceRange.max < 5000)
    additionalCount++;

  return booleanCount + additionalCount;
}

/**
 * Type-safe property getter for filter state
 */
export function getFilterProperty<K extends keyof FilterState>(
  state: FilterState,
  key: K,
): FilterState[K] {
  return state[key];
}

/**
 * Create a partial update for a filter category
 */
export function createFilterUpdate<K extends keyof FilterState>(
  category: K,
  currentValue: FilterState[K],
  update: Partial<FilterState[K]>,
): { [P in K]: FilterState[K] } {
  return {
    [category]: Object.assign({}, currentValue, update),
  } as { [P in K]: FilterState[K] };
}

/**
 * Extract filter state without actions (type-safe)
 */
export type FilterStateOnly = Omit<
  FilterState,
  | "setFilter"
  | "setNestedFilter"
  | "toggleQuickFilter"
  | "setSearchQuery"
  | "setSortBy"
  | "setLocation"
  | "setPriceRange"
  | "clearAll"
  | "clearCategory"
  | "getActiveFilterCount"
  | "snapshot"
  | "loadSnapshot"
  | "hasActiveFilters"
>;

