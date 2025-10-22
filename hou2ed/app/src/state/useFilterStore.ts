import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FilterState, FilterActions, SortOption } from "../types/filters";
import {
  QUICK_FILTER_STRATEGIES,
  countAllActiveFilters,
  createFilterUpdate,
} from "../utils/filterHelpers";

// Default filter values
const createDefaultFilters = (): FilterState => ({
  housingType: {
    emergencyShelter: false,
    transitionalHousing: false,
    rapidRehousing: false,
    permanentSupportive: false,
    soberLiving: false,
    halfwayHouse: false,
    groupHome: false,
    independentLiving: false,
    assistedLiving: false,
    nursingHome: false,
    veteransHousing: false,
    youthHousing: false,
    domesticViolenceShelter: false,
  },
  unitBedType: {
    privateRoom: false,
    sharedRoom: false,
    dormStyle: false,
    privateApartment: false,
    sharedApartment: false,
    singleOccupancy: false,
    doubleOccupancy: false,
    familyUnit: false,
    couplesAllowed: false,
    petsAllowed: false,
  },
  amenities: {
    wifi: false,
    parking: false,
    laundry: false,
    kitchen: false,
    mealProgram: false,
    computerLab: false,
    library: false,
    gym: false,
    outdoorSpace: false,
    smokingArea: false,
    tvLounge: false,
    gameRoom: false,
    storageSpace: false,
    bikeStorage: false,
    mailService: false,
  },
  accessibility: {
    wheelchairAccessible: false,
    elevatorsAvailable: false,
    rampAccess: false,
    accessibleBathroom: false,
    grabBars: false,
    wideDoorways: false,
    lowCounters: false,
    visualAids: false,
    hearingAids: false,
    brailleSignage: false,
    serviceAnimalAllowed: false,
  },
  roomDetails: {
    furnished: false,
    unfurnished: false,
    semiFurnished: false,
    utilities: false,
    airConditioning: false,
    heating: false,
    privateEntrance: false,
    privateBathroom: false,
    sharedBathroom: false,
    closetSpace: false,
    naturalLight: false,
  },
  eligibility: {
    noIdRequired: false,
    noCreditCheck: false,
    noBackgroundCheck: false,
    noIncomeRequirement: false,
    housingVoucherAccepted: false,
    section8Accepted: false,
    undocumentedOk: false,
    exOffenderOk: false,
    evictionOk: false,
    activeAddictionOk: false,
    menOnly: false,
    womenOnly: false,
    lgbtqFriendly: false,
    youthOnly: false,
    seniorsOnly: false,
    veteransOnly: false,
    familiesOnly: false,
  },
  supportPrograms: {
    caseManagement: false,
    mentalHealthServices: false,
    substanceAbuseProgram: false,
    jobTraining: false,
    educationalPrograms: false,
    lifeSkillsClasses: false,
    counseling: false,
    medicalServices: false,
    legalAssistance: false,
    childcare: false,
    transportationAssistance: false,
    foodPantry: false,
    clothingCloset: false,
    financialLiteracy: false,
    housingNavigation: false,
  },
  costPayment: {
    free: false,
    slidingScale: false,
    under500: false,
    under1000: false,
    under1500: false,
    depositRequired: false,
    noDeposit: false,
    firstMonthFree: false,
    utilitiesIncluded: false,
    paymentPlanAvailable: false,
    governmentSubsidized: false,
  },
  locationEnv: {
    nearPublicTransit: false,
    nearGroceryStore: false,
    nearMedicalFacility: false,
    nearSchools: false,
    nearEmployment: false,
    downtown: false,
    suburban: false,
    rural: false,
    quietNeighborhood: false,
    gatedCommunity: false,
    securityOnSite: false,
    safeForChildren: false,
  },
  rulesRequirements: {
    noSmoking: false,
    noDrugs: false,
    noAlcohol: false,
    noVisitors: false,
    noOvernightGuests: false,
    curfew: false,
    noCurfew: false,
    mandatoryMeetings: false,
    mandatoryChores: false,
    randomDrugTesting: false,
    sobrietyRequired: false,
    workRequirement: false,
    programParticipation: false,
  },
  availabilityIntake: {
    availableNow: false,
    waitlistOpen: false,
    within7Days: false,
    within30Days: false,
    within90Days: false,
    walkInsAccepted: false,
    appointmentRequired: false,
    referralRequired: false,
    onlineApplicationAvailable: false,
    phoneIntakeAvailable: false,
    weekendIntake: false,
    eveningIntake: false,
    sameDay: false,
    emergencyPlacement: false,
  },
  providerQuality: {
    accredited: false,
    licensed: false,
    governmentFunded: false,
    nonprofit: false,
    faithBased: false,
    secularOnly: false,
    highRating: false,
    lowComplaints: false,
    recentInspection: false,
    goodReputation: false,
  },
  communityLifestyle: {
    quietEnvironment: false,
    socialEnvironment: false,
    familyFriendly: false,
    seniorCommunity: false,
    youthFocused: false,
    recoveryFocused: false,
    culturallySpecific: false,
    lgbtqCommunity: false,
    veteranCommunity: false,
    religiousAffiliation: false,
    secularCommunity: false,
    mixedCommunity: false,
  },
  advanced: {
    newListings: false,
    verifiedListings: false,
    photoAvailable: false,
    virtualTourAvailable: false,
    recentlyRenovated: false,
    greenBuilding: false,
    historicBuilding: false,
    nearParks: false,
    nearWater: false,
    mountainView: false,
    groundFloor: false,
    topFloor: false,
  },
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
