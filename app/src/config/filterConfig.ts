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

// Based on EXACTLY what ListingWizard collects
export const FILTER_SECTIONS: FilterSections = {
  amenities: {
    title: "Amenities",
    filters: [
      { key: "wifi", label: "Wi-Fi" },
      { key: "laundry", label: "Laundry" },
      { key: "kitchen", label: "Kitchen" },
      { key: "meals", label: "Meals Provided" },
      { key: "showers", label: "Showers" },
      { key: "storage", label: "Storage Lockers" },
      { key: "common_area", label: "Common Area" },
      { key: "ac", label: "Air Conditioning" },
      { key: "heating", label: "Heating" },
    ],
  },
  supportPrograms: {
    title: "Services",
    filters: [
      { key: "case_management", label: "Case Management" },
      { key: "medical", label: "Medical Services" },
      { key: "mental_health", label: "Mental Health Services" },
      { key: "substance_abuse", label: "Substance Abuse Services" },
      { key: "job_training", label: "Job Training" },
      { key: "education", label: "Education Support" },
      { key: "transportation", label: "Transportation Assistance" },
      { key: "legal", label: "Legal Aid" },
    ],
  },
  eligibility: {
    title: "Who Can Apply",
    filters: [
      { key: "all_genders", label: "All Genders Welcome" },
      { key: "men_only", label: "Men Only" },
      { key: "women_only", label: "Women Only" },
      { key: "families", label: "Families Welcome" },
      { key: "veterans", label: "Veterans Welcome" },
      { key: "lgbtq", label: "LGBTQ+ Friendly" },
      { key: "youth", label: "Youth (18-24)" },
      { key: "seniors", label: "Seniors (55+)" },
    ],
  },
  rules: {
    title: "Policies",
    filters: [
      { key: "pets_allowed", label: "Pets Allowed" },
      { key: "service_only", label: "Service Animals Only" },
    ],
  },
  costPayment: {
    title: "Cost",
    filters: [
      { key: "free", label: "Free" },
      { key: "under500", label: "Under $500/mo" },
      { key: "under1000", label: "Under $1000/mo" },
    ],
  },
  availabilityIntake: {
    title: "Availability",
    filters: [{ key: "available_now", label: "Available Now (beds today)" }],
  },
};

// Helper function to get filter count for a category
export function getFilterCount(filters: Record<string, boolean>): number {
  return Object.values(filters).filter(Boolean).length;
}

// Helper function to get all filter keys for a category
export function getCategoryFilterKeys(categoryKey: string): string[] {
  const category = FILTER_SECTIONS[categoryKey];
  return category ? category.filters.map((f) => f.key) : [];
}

// Helper function to get filter label by key
export function getFilterLabel(categoryKey: string, filterKey: string): string {
  const category = FILTER_SECTIONS[categoryKey];
  if (!category) return filterKey;

  const filter = category.filters.find((f) => f.key === filterKey);
  return filter?.label || filterKey;
}
