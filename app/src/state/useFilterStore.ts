import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FilterState, FilterActions, SortOption } from "../types/filters";
import {
  QUICK_FILTER_STRATEGIES,
  countAllActiveFilters,
  createFilterUpdate,
} from "../utils/filterHelpers";

// Default filter values (match EXACTLY what ListingWizard collects)
const createDefaultFilters = (): FilterState => ({
  housingType: {
    emergencyShelter:        false,
    transitionalHousing:     false,
    rapidRehousing:          false,
    permanentSupportive:     false,
    soberLiving:             false,
    halfwayHouse:            false,
    groupHome:               false,
    independentLiving:       false,
    assistedLiving:          false,
    nursingHome:             false,
    veteransHousing:         false,
    youthHousing:            false,
    domesticViolenceShelter: false,
  },
  unitBedType: {} as any,
  amenities: {
    wifi: false,
    laundry: false,
    kitchen: false,
    meals: false,
    showers: false,
    storage: false,
    common_area: false,
    ac: false,
    heating: false,
  } as any,
  accessibility: {} as any,
  roomDetails: {} as any,
  eligibility: {
    all_genders: false,
    men_only: false,
    women_only: false,
    families: false,
    veterans: false,
    lgbtq: false,
    youth: false,
    seniors: false,
  } as any,
  supportPrograms: {
    case_management: false,
    medical: false,
    mental_health: false,
    substance_abuse: false,
    job_training: false,
    education: false,
    transportation: false,
    legal: false,
  } as any,
  costPayment: {
    free: false,
    under500: false,
    under1000: false,
  } as any,
  locationEnv: {} as any,
  rulesRequirements: {
    pets_allowed: false,
    service_only: false,
  } as any,
  availabilityIntake: {
    available_now: false,
  } as any,
  providerQuality: {} as any,
  communityLifestyle: {} as any,
  advanced: {} as any,
  priceRange: {
    min: 0,
    max: 5000,
  },
  location: {
    latitude: undefined,
    longitude: undefined,
    radius: 10, // 10 miles default
    zipCode: undefined,
    city: undefined,
    neighborhood: undefined,
  },
  searchQuery: "",
  sortBy: "relevance" as SortOption,
  quickFilters: {
    immediate: false,
    free: false,
    veterans: false,
    families: false,
    nearMe: false,
  },
});

// Store type combining state and actions
type FilterStore = FilterState & FilterActions;

// Create the store with persistence
export const useFilterStore = create<FilterStore>()(
  persist(
    (set, get) => ({
      // Initial state
      ...createDefaultFilters(),

      // Actions
      setFilter: (category, value) =>
        set((state) => createFilterUpdate(category, state[category], value)),

      setNestedFilter: (category, field, value) =>
        set((state) => {
          const currentCategory = state[category];
          if (typeof currentCategory === "object" && currentCategory !== null) {
            return {
              [category]: {
                ...currentCategory,
                [field]: value,
              },
            };
          }
          return {};
        }),

      toggleQuickFilter: (filter) =>
        set((state) => {
          const newQuickFilters = {
            ...state.quickFilters,
            [filter]: !state.quickFilters[filter],
          };

          // Use strategy pattern for quick filter updates
          const strategy = QUICK_FILTER_STRATEGIES[filter];
          const additionalChanges =
            newQuickFilters[filter] && strategy ? strategy(state) : {};

          return {
            quickFilters: newQuickFilters,
            ...additionalChanges,
          };
        }),

      setSearchQuery: (query) => set({ searchQuery: query }),

      setSortBy: (sort) => set({ sortBy: sort }),

      setLocation: (location) =>
        set((state) => ({
          location: {
            ...state.location,
            ...location,
          },
        })),

      setPriceRange: (range) =>
        set((state) => ({
          priceRange: {
            ...state.priceRange,
            ...range,
          },
        })),

      clearAll: () => set(createDefaultFilters()),

      clearCategory: (category) => {
        const defaults = createDefaultFilters();
        set(() => ({ [category]: defaults[category] }));
      },

      getActiveFilterCount: () => countAllActiveFilters(get()),

      snapshot: () => {
        const state = get();
        // Use type assertion for known action keys
        const actionKeys: (keyof FilterActions)[] = [
          "setFilter",
          "setNestedFilter",
          "toggleQuickFilter",
          "setSearchQuery",
          "setSortBy",
          "setLocation",
          "setPriceRange",
          "clearAll",
          "clearCategory",
          "getActiveFilterCount",
          "snapshot",
          "loadSnapshot",
          "hasActiveFilters",
        ];

        const filterState = { ...state };
        actionKeys.forEach((key) => delete (filterState as any)[key]);
        return filterState as FilterState;
      },

      loadSnapshot: (snapshot) => set(snapshot),

      hasActiveFilters: () => {
        return get().getActiveFilterCount() > 0;
      },
    }),
    {
      name: "filter-storage", // unique name for storage
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => {
        // Only persist the filter state, not the actions
        const actionKeys: (keyof FilterActions)[] = [
          "setFilter",
          "setNestedFilter",
          "toggleQuickFilter",
          "setSearchQuery",
          "setSortBy",
          "setLocation",
          "setPriceRange",
          "clearAll",
          "clearCategory",
          "getActiveFilterCount",
          "snapshot",
          "loadSnapshot",
          "hasActiveFilters",
        ];

        const filterState = { ...state };
        actionKeys.forEach((key) => delete (filterState as any)[key]);
        return filterState as FilterState;
      },
    },
  ),
);
