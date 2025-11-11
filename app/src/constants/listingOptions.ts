/**
 * Shared constants for listing amenities, services, rules, and eligibility
 * This ensures consistent labels between provider input and seeker display
 */

// Amenities options with labels
export const AMENITIES_OPTIONS = [
  { label: "Wi-Fi", value: "wifi" },
  { label: "Laundry", value: "laundry" },
  { label: "Kitchen", value: "kitchen" },
  { label: "Meals Provided", value: "meals" },
  { label: "Showers", value: "showers" },
  { label: "Storage Lockers", value: "storage" },
  { label: "Common Area", value: "common_area" },
  { label: "Air Conditioning", value: "ac" },
  { label: "Heating", value: "heating" },
] as const;

// Services options with labels
export const SERVICES_OPTIONS = [
  { label: "Case Management", value: "case_management" },
  { label: "Medical Services", value: "medical" },
  { label: "Mental Health Services", value: "mental_health" },
  { label: "Substance Abuse Services", value: "substance_abuse" },
  { label: "Job Training", value: "job_training" },
  { label: "Education Support", value: "education" },
  { label: "Transportation Assistance", value: "transportation" },
  { label: "Legal Aid", value: "legal" },
] as const;

// Eligibility options with labels
export const ELIGIBILITY_OPTIONS = [
  { label: "All Genders Welcome", value: "all_genders" },
  { label: "Men Only", value: "men_only" },
  { label: "Women Only", value: "women_only" },
  { label: "Families Welcome", value: "families" },
  { label: "Veterans Welcome", value: "veterans" },
  { label: "LGBTQ+ Friendly", value: "lgbtq" },
  { label: "Youth (18-24)", value: "youth" },
  { label: "Seniors (55+)", value: "seniors" },
] as const;

// Pet policy options with labels
export const PET_POLICY_OPTIONS = [
  { label: "Pets Allowed", value: "allowed" },
  { label: "Service Animals Only", value: "service_only" },
  { label: "No Pets", value: "not_allowed" },
] as const;

// Helper function: Convert value to label (e.g., "wifi" → "Wi-Fi")
export function getAmenityLabel(value: string): string {
  const option = AMENITIES_OPTIONS.find((opt) => opt.value === value);
  return option ? option.label : value; // Return original value if not found
}

export function getServiceLabel(value: string): string {
  const option = SERVICES_OPTIONS.find((opt) => opt.value === value);
  return option ? option.label : value;
}

export function getEligibilityLabel(value: string): string {
  const option = ELIGIBILITY_OPTIONS.find((opt) => opt.value === value);
  return option ? option.label : value;
}

export function getPetPolicyLabel(value: string): string {
  const option = PET_POLICY_OPTIONS.find((opt) => opt.value === value);
  return option ? option.label : value;
}

// Helper function: Parse database amenities to nice labels
export function parseAmenities(dbAmenities: any): string[] {
  if (!dbAmenities) return [];

  // Handle if it's stored as an object with a "basic" key
  if (typeof dbAmenities === "object" && !Array.isArray(dbAmenities)) {
    const basicAmenities = dbAmenities.basic || [];
    const customAmenities = dbAmenities.custom || [];
    return [
      ...basicAmenities.map(getAmenityLabel),
      ...customAmenities, // Custom amenities are already strings
    ];
  }

  // Handle if it's already an array
  if (Array.isArray(dbAmenities)) {
    return dbAmenities.map(getAmenityLabel);
  }

  return [];
}

// Helper function: Parse database services to nice labels
export function parseServices(dbServices: any): string[] {
  if (!dbServices) return [];

  // Handle if it's stored as an object (current format)
  if (typeof dbServices === "object" && !Array.isArray(dbServices)) {
    const services: string[] = [];

    // Check each possible service key
    if (dbServices.case_management) services.push("Case Management");
    if (dbServices.medical) services.push("Medical Services");
    if (dbServices.mental_health) services.push("Mental Health Services");
    if (dbServices.substance) services.push("Substance Abuse Services");
    if (dbServices.employment) services.push("Job Training");
    if (dbServices.education) services.push("Education Support");
    if (dbServices.transportation) services.push("Transportation Assistance");
    if (dbServices.legal) services.push("Legal Aid");

    // Add custom services if they exist
    if (dbServices.custom && Array.isArray(dbServices.custom)) {
      services.push(...dbServices.custom);
    }

    return services;
  }

  // Handle if it's already an array (for backward compatibility)
  if (Array.isArray(dbServices)) {
    return dbServices.map(getServiceLabel);
  }

  return [];
}

// Helper function: Parse database rules to nice display
export function parseRules(dbRules: any): string[] {
  if (!dbRules) return [];

  const rules: string[] = [];

  // Handle if it's stored as an object
  if (typeof dbRules === "object" && !Array.isArray(dbRules)) {
    if (dbRules.curfew) {
      rules.push(`Curfew: ${dbRules.curfew}`);
    }
    if (dbRules.visitors) {
      rules.push(`Visitors: ${dbRules.visitors}`);
    }
    if (dbRules.pets) {
      rules.push(`Pets: ${getPetPolicyLabel(dbRules.pets)}`);
    }
    // Add custom rules if they exist
    if (dbRules.custom && Array.isArray(dbRules.custom)) {
      rules.push(...dbRules.custom);
    }
  }

  // Handle if it's already an array
  if (Array.isArray(dbRules)) {
    return dbRules;
  }

  return rules;
}

// Helper function: Parse database eligibility to nice display
export function parseEligibility(dbEligibility: any): string[] {
  if (!dbEligibility) return [];

  const eligibility: string[] = [];

  // Handle if it's stored as an object
  if (typeof dbEligibility === "object" && !Array.isArray(dbEligibility)) {
    // Age range
    if (dbEligibility.age_range && Array.isArray(dbEligibility.age_range)) {
      const [min, max] = dbEligibility.age_range;
      if (min || max) {
        eligibility.push(`Ages ${min || 18} to ${max || "any"}`);
      }
    }

    // Gender
    if (dbEligibility.gender && Array.isArray(dbEligibility.gender)) {
      const genderOptions = dbEligibility.gender;
      if (genderOptions.includes("all")) {
        eligibility.push("All Genders Welcome");
      } else {
        if (genderOptions.includes("male")) eligibility.push("Men Only");
        if (genderOptions.includes("female")) eligibility.push("Women Only");
      }
    }

    // Family status
    if (
      dbEligibility.family_status &&
      Array.isArray(dbEligibility.family_status)
    ) {
      if (dbEligibility.family_status.includes("families")) {
        eligibility.push("Families Welcome");
      }
    }

    // Veterans
    if (dbEligibility.veterans) {
      eligibility.push("Veterans Welcome");
    }

    // Add custom eligibility if they exist
    if (dbEligibility.custom && Array.isArray(dbEligibility.custom)) {
      eligibility.push(...dbEligibility.custom);
    }
  }

  // Handle if it's already an array
  if (Array.isArray(dbEligibility)) {
    return dbEligibility.map(getEligibilityLabel);
  }

  return eligibility;
}
