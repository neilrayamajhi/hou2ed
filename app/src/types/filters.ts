/**
 * Comprehensive filter types for housing search
 */

// Housing Type
export interface HousingTypeFilter {
  emergencyShelter: boolean;
  transitionalHousing: boolean;
  rapidRehousing: boolean;
  permanentSupportive: boolean;
  soberLiving: boolean;
  halfwayHouse: boolean;
  groupHome: boolean;
  independentLiving: boolean;
  assistedLiving: boolean;
  nursingHome: boolean;
  veteransHousing: boolean;
  youthHousing: boolean;
  domesticViolenceShelter: boolean;
}

// Unit & Bed Type
export interface UnitBedTypeFilter {
  privateRoom: boolean;
  sharedRoom: boolean;
  dormStyle: boolean;
  privateApartment: boolean;
  sharedApartment: boolean;
  singleOccupancy: boolean;
  doubleOccupancy: boolean;
  familyUnit: boolean;
  couplesAllowed: boolean;
  petsAllowed: boolean;
}

// Amenities
export interface AmenitiesFilter {
  wifi: boolean;
  parking: boolean;
  laundry: boolean;
  kitchen: boolean;
  mealProgram: boolean;
  computerLab: boolean;
  library: boolean;
  gym: boolean;
  outdoorSpace: boolean;
  smokingArea: boolean;
  tvLounge: boolean;
  gameRoom: boolean;
  storageSpace: boolean;
  bikeStorage: boolean;
  mailService: boolean;
}

// Accessibility
export interface AccessibilityFilter {
  wheelchairAccessible: boolean;
  elevatorsAvailable: boolean;
  rampAccess: boolean;
  accessibleBathroom: boolean;
  grabBars: boolean;
  wideDoorways: boolean;
  lowCounters: boolean;
  visualAids: boolean;
  hearingAids: boolean;
  brailleSignage: boolean;
  serviceAnimalAllowed: boolean;
}

// Room Details
export interface RoomDetailsFilter {
  furnished: boolean;
  unfurnished: boolean;
  semiFurnished: boolean;
  utilities: boolean;
  airConditioning: boolean;
  heating: boolean;
  privateEntrance: boolean;
  privateBathroom: boolean;
  sharedBathroom: boolean;
  closetSpace: boolean;
  naturalLight: boolean;
}

// Eligibility
export interface EligibilityFilter {
  noIdRequired: boolean;
  noCreditCheck: boolean;
  noBackgroundCheck: boolean;
  noIncomeRequirement: boolean;
  housingVoucherAccepted: boolean;
  section8Accepted: boolean;
  undocumentedOk: boolean;
  exOffenderOk: boolean;
  evictionOk: boolean;
  activeAddictionOk: boolean;
  menOnly: boolean;
  womenOnly: boolean;
  lgbtqFriendly: boolean;
  youthOnly: boolean;
  seniorsOnly: boolean;
  veteransOnly: boolean;
  familiesOnly: boolean;
}

// Support Programs
export interface SupportProgramsFilter {
  caseManagement: boolean;
  mentalHealthServices: boolean;
  substanceAbuseProgram: boolean;
  jobTraining: boolean;
  educationalPrograms: boolean;
  lifeSkillsClasses: boolean;
  counseling: boolean;
  medicalServices: boolean;
  legalAssistance: boolean;
  childcare: boolean;
  transportationAssistance: boolean;
  foodPantry: boolean;
  clothingCloset: boolean;
  financialLiteracy: boolean;
  housingNavigation: boolean;
}

// Cost & Payment
export interface CostPaymentFilter {
  free: boolean;
  slidingScale: boolean;
  under500: boolean;
  under1000: boolean;
  under1500: boolean;
  depositRequired: boolean;
  noDeposit: boolean;
  firstMonthFree: boolean;
  utilitiesIncluded: boolean;
  paymentPlanAvailable: boolean;
  governmentSubsidized: boolean;
}

// Location & Environment
export interface LocationEnvFilter {
  nearPublicTransit: boolean;
  nearGroceryStore: boolean;
  nearMedicalFacility: boolean;
  nearSchools: boolean;
  nearEmployment: boolean;
  downtown: boolean;
  suburban: boolean;
  rural: boolean;
  quietNeighborhood: boolean;
  gatedCommunity: boolean;
  securityOnSite: boolean;
  safeForChildren: boolean;
}

// Rules & Requirements
export interface RulesRequirementsFilter {
  noSmoking: boolean;
  noDrugs: boolean;
  noAlcohol: boolean;
  noVisitors: boolean;
  noOvernightGuests: boolean;
  curfew: boolean;
  noCurfew: boolean;
  mandatoryMeetings: boolean;
  mandatoryChores: boolean;
  randomDrugTesting: boolean;
  sobrietyRequired: boolean;
  workRequirement: boolean;
  programParticipation: boolean;
}

// Availability & Intake
export interface AvailabilityIntakeFilter {
  availableNow: boolean;
  waitlistOpen: boolean;
  within7Days: boolean;
  within30Days: boolean;
  within90Days: boolean;
  walkInsAccepted: boolean;
  appointmentRequired: boolean;
  referralRequired: boolean;
  onlineApplicationAvailable: boolean;
  phoneIntakeAvailable: boolean;
  weekendIntake: boolean;
  eveningIntake: boolean;
  sameDay: boolean;
  emergencyPlacement: boolean;
}

// Provider Quality
export interface ProviderQualityFilter {
  accredited: boolean;
  licensed: boolean;
  governmentFunded: boolean;
  nonprofit: boolean;
  faithBased: boolean;
  secularOnly: boolean;
  highRating: boolean; // 4+ stars
  lowComplaints: boolean;
  recentInspection: boolean;
  goodReputation: boolean;
}

// Community & Lifestyle
export interface CommunityLifestyleFilter {
  quietEnvironment: boolean;
  socialEnvironment: boolean;
  familyFriendly: boolean;
  seniorCommunity: boolean;
  youthFocused: boolean;
  recoveryFocused: boolean;
  culturallySpecific: boolean;
  lgbtqCommunity: boolean;
  veteranCommunity: boolean;
  religiousAffiliation: boolean;
  secularCommunity: boolean;
  mixedCommunity: boolean;
}

// Advanced Filters
export interface AdvancedFilter {
  newListings: boolean; // Added in last 7 days
  verifiedListings: boolean;
  photoAvailable: boolean;
  virtualTourAvailable: boolean;
  recentlyRenovated: boolean;
  greenBuilding: boolean;
  historicBuilding: boolean;
  nearParks: boolean;
  nearWater: boolean;
  mountainView: boolean;
  groundFloor: boolean;
  topFloor: boolean;
}

// Price Range
export interface PriceRange {
  min: number;
  max: number;
}

// Distance/Location
export interface LocationFilter {
  latitude?: number;
  longitude?: number;
  radius: number; // in miles
  zipCode?: string;
  city?: string;
  neighborhood?: string;
}

// Sort Options
export type SortOption =
  | "relevance"
  | "priceAsc"
  | "priceDesc"
  | "distance"
  | "availability"
  | "rating"
  | "newest";

// Combined Filter State
export interface FilterState {
  // Filter groups
  housingType: HousingTypeFilter;
  unitBedType: UnitBedTypeFilter;
  amenities: AmenitiesFilter;
  accessibility: AccessibilityFilter;
  roomDetails: RoomDetailsFilter;
  eligibility: EligibilityFilter;
  supportPrograms: SupportProgramsFilter;
  costPayment: CostPaymentFilter;
  locationEnv: LocationEnvFilter;
  rulesRequirements: RulesRequirementsFilter;
  availabilityIntake: AvailabilityIntakeFilter;
  providerQuality: ProviderQualityFilter;
  communityLifestyle: CommunityLifestyleFilter;
  advanced: AdvancedFilter;

  // Additional filters
  priceRange: PriceRange;
  location: LocationFilter;
  searchQuery: string;
  sortBy: SortOption;

  // Quick filters (for chips)
  quickFilters: {
    immediate: boolean;
    free: boolean;
    veterans: boolean;
    families: boolean;
    nearMe: boolean;
  };
}

// Filter Actions
export interface FilterActions {
  // Set individual filter
  setFilter: <K extends keyof FilterState>(
    category: K,
    value: Partial<FilterState[K]>,
  ) => void;

  // Set nested filter
  setNestedFilter: <
    K extends keyof FilterState,
    NK extends keyof FilterState[K],
  >(
    category: K,
    field: NK,
    value: FilterState[K][NK],
  ) => void;

  // Quick filter toggles
  toggleQuickFilter: (filter: keyof FilterState["quickFilters"]) => void;

  // Set search query
  setSearchQuery: (query: string) => void;

  // Set sort option
  setSortBy: (sort: SortOption) => void;

  // Set location
  setLocation: (location: Partial<LocationFilter>) => void;

  // Set price range
  setPriceRange: (range: Partial<PriceRange>) => void;

  // Clear all filters
  clearAll: () => void;

  // Clear specific category
  clearCategory: (category: keyof FilterState) => void;

  // Get active filter count
  getActiveFilterCount: () => number;

  // Get snapshot of current filters
  snapshot: () => FilterState;

  // Load filters from snapshot
  loadSnapshot: (snapshot: Partial<FilterState>) => void;

  // Check if any filters are active
  hasActiveFilters: () => boolean;
}

