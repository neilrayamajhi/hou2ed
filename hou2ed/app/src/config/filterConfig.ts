/**
 * Filter configuration for FiltersSheet component
 * This file contains all filter section definitions to keep the component clean
 */

export interface FilterOption {
  key: string;
  label: string;
}

export interface FilterSectionConfig {
  title: string;
  filters: FilterOption[];
}

export type FilterSections = {
  [key: string]: FilterSectionConfig;
};

export const FILTER_SECTIONS: FilterSections = {
  housingType: {
    title: "Housing Type",
    filters: [
      { key: "emergencyShelter", label: "Emergency Shelter" },
      { key: "transitionalHousing", label: "Transitional Housing" },
      { key: "rapidRehousing", label: "Rapid Rehousing" },
      { key: "permanentSupportive", label: "Permanent Supportive" },
      { key: "soberLiving", label: "Sober Living" },
      { key: "halfwayHouse", label: "Halfway House" },
      { key: "veteransHousing", label: "Veterans Housing" },
      { key: "youthHousing", label: "Youth Housing" },
      { key: "domesticViolenceShelter", label: "DV Shelter" },
    ],
  },
  unitBedType: {
    title: "Unit & Bed Type",
    filters: [
      { key: "privateRoom", label: "Private Room" },
      { key: "sharedRoom", label: "Shared Room" },
      { key: "dormStyle", label: "Dorm Style" },
      { key: "privateApartment", label: "Private Apartment" },
      { key: "familyUnit", label: "Family Unit" },
      { key: "couplesAllowed", label: "Couples Allowed" },
      { key: "petsAllowed", label: "Pets Allowed" },
    ],
  },
  amenities: {
    title: "Amenities",
    filters: [
      { key: "wifi", label: "WiFi" },
      { key: "parking", label: "Parking" },
      { key: "laundry", label: "Laundry" },
      { key: "kitchen", label: "Kitchen" },
      { key: "mealProgram", label: "Meal Program" },
      { key: "computerLab", label: "Computer Lab" },
      { key: "gym", label: "Gym" },
      { key: "outdoorSpace", label: "Outdoor Space" },
    ],
  },
  accessibility: {
    title: "Accessibility",
    filters: [
      { key: "wheelchairAccessible", label: "Wheelchair Accessible" },
      { key: "elevatorsAvailable", label: "Elevators" },
      { key: "accessibleBathroom", label: "Accessible Bathroom" },
      { key: "serviceAnimalAllowed", label: "Service Animals OK" },
    ],
  },
  eligibility: {
    title: "Eligibility",
    filters: [
      { key: "noIdRequired", label: "No ID Required" },
      { key: "noCreditCheck", label: "No Credit Check" },
      { key: "noBackgroundCheck", label: "No Background Check" },
      { key: "noIncomeRequirement", label: "No Income Requirement" },
      { key: "housingVoucherAccepted", label: "Housing Vouchers OK" },
      { key: "veteransOnly", label: "Veterans Only" },
      { key: "familiesOnly", label: "Families Only" },
      { key: "lgbtqFriendly", label: "LGBTQ+ Friendly" },
    ],
  },
  supportPrograms: {
    title: "Support Programs",
    filters: [
      { key: "caseManagement", label: "Case Management" },
      { key: "mentalHealthServices", label: "Mental Health" },
      { key: "substanceAbuseProgram", label: "Substance Abuse" },
      { key: "jobTraining", label: "Job Training" },
      { key: "medicalServices", label: "Medical Services" },
      { key: "childcare", label: "Childcare" },
    ],
  },
  costPayment: {
    title: "Cost & Payment",
    filters: [
      { key: "free", label: "Free" },
      { key: "slidingScale", label: "Sliding Scale" },
      { key: "under500", label: "Under $500" },
      { key: "under1000", label: "Under $1000" },
      { key: "noDeposit", label: "No Deposit" },
      { key: "utilitiesIncluded", label: "Utilities Included" },
    ],
  },
  availabilityIntake: {
    title: "Availability",
    filters: [
      { key: "availableNow", label: "Available Now" },
      { key: "waitlistOpen", label: "Waitlist Open" },
      { key: "sameDay", label: "Same Day Intake" },
      { key: "walkInsAccepted", label: "Walk-ins OK" },
      { key: "emergencyPlacement", label: "Emergency Placement" },
    ],
  },
};

// Helper function to get filter count for a category
export function getFilterCount(filters: Record<string, boolean>): number {
  return Object.values(filters).filter(Boolean).length;
}

// Helper function to get all filter keys for a category
export function getCategoryFilterKeys(categoryKey: string): string[] {
  const category = FILTER_SECTIONS[categoryKey];
  return category ? category.filters.map(f => f.key) : [];
}

// Helper function to get filter label by key
export function getFilterLabel(categoryKey: string, filterKey: string): string {
  const category = FILTER_SECTIONS[categoryKey];
  if (!category) return filterKey;

  const filter = category.filters.find(f => f.key === filterKey);
  return filter?.label || filterKey;
}