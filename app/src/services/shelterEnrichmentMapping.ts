/**
 * Shelter Enrichment Mapping
 *
 * Provides manually-curated data for known shelters that OpenStreetMap
 * doesn't fully cover. Each entry matches shelters by name and fills in
 * missing fields like address, phone, photos, amenities, services, etc.
 *
 * To add a new shelter: copy an existing entry, update the namePatterns
 * and data fields, and add it to SHELTER_ENRICHMENT_MAPPINGS below.
 *
 * NOTE: Do NOT add website URLs here — those live in shelterWebsiteMapping.ts.
 */

export interface ShelterEnrichmentAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface ShelterEnrichmentContact {
  phone?: string;
  email?: string;
}

export interface ShelterEnrichmentData {
  address?: ShelterEnrichmentAddress;
  contact?: ShelterEnrichmentContact;
  photos?: string[];
  amenities?: string[];
  services?: string[];
  rules?: string[];
  eligibility?: string[];
  description?: string;
  capacity?: number;
}

interface ShelterEnrichmentMapping {
  namePatterns: string[];
  operatorPatterns?: string[];
  data: ShelterEnrichmentData;
  description?: string;
}

export const SHELTER_ENRICHMENT_MAPPINGS: ShelterEnrichmentMapping[] = [
  {
    namePatterns: ["union rescue mission", "urm"],
    data: {
      address: {
        street: "545 S San Pedro St",
        city: "Los Angeles",
        state: "CA",
        zip: "90013",
      },
      contact: {
        phone: "(213) 896-4200",
        email: "info@urm.org",
      },
      amenities: [
        "Beds with linens",
        "Showers",
        "Laundry facilities",
        "Computer lab",
        "Wheelchair accessible",
      ],
      services: [
        "Case management",
        "Meals provided (3 per day)",
        "Job training programs",
        "Substance abuse counseling",
        "Mental health services",
        "Children's programs",
        "Medical clinic on-site",
      ],
      rules: [
        "No alcohol or drugs on premises",
        "No weapons allowed",
        "Curfew enforced",
        "Respect staff and other residents",
      ],
      eligibility: [
        "Men, women, and families welcome",
        "Must be experiencing homelessness",
        "Sober at time of intake",
      ],
      capacity: 1500,
    },
    description: "Union Rescue Mission — largest emergency shelter on the West Coast",
  },
  {
    namePatterns: ["midnight mission"],
    data: {
      address: {
        street: "601 S San Pedro St",
        city: "Los Angeles",
        state: "CA",
        zip: "90014",
      },
      contact: {
        phone: "(213) 624-9258",
      },
      amenities: [
        "Dormitory beds",
        "Showers and laundry",
        "Dining room (meals daily)",
        "Recreation room",
        "Secure storage",
      ],
      services: [
        "Case management",
        "12-step recovery programs",
        "Job readiness training",
        "GED / education classes",
        "Legal aid referrals",
        "Housing navigation",
      ],
      rules: [
        "Zero tolerance for alcohol and drugs",
        "Curfew at 10 PM",
        "Must participate in programming",
        "No overnight guests",
      ],
      eligibility: [
        "Adults 18 and older",
        "Experiencing homelessness",
        "Willing to participate in recovery programs",
      ],
      capacity: 300,
    },
    description: "The Midnight Mission — Skid Row emergency shelter and recovery programs",
  },
  {
    namePatterns: ["downtown women's center", "downtown womens center", "dwc"],
    data: {
      address: {
        street: "442 S San Pedro St",
        city: "Los Angeles",
        state: "CA",
        zip: "90013",
      },
      contact: {
        phone: "(213) 680-0600",
        email: "info@downtownwomenscenter.org",
      },
      amenities: [
        "Private and semi-private rooms",
        "Showers and laundry",
        "Health clinic on-site",
        "Art studio",
        "Computer lab",
        "Wheelchair accessible",
      ],
      services: [
        "Trauma-informed case management",
        "Mental health counseling",
        "Medical and dental care",
        "Job training",
        "Permanent supportive housing placement",
        "Legal advocacy",
      ],
      rules: [
        "Women only",
        "No alcohol or illegal substances",
        "Participate in case management",
        "Curfew as scheduled",
      ],
      eligibility: [
        "Women 18 and older",
        "Experiencing homelessness or at risk",
        "Willingness to engage in services",
      ],
      capacity: 120,
      description:
        "Downtown Women's Center provides permanent supportive housing and comprehensive services exclusively for women on Skid Row.",
    },
    description: "Downtown Women's Center — women-only shelter and services, Skid Row",
  },
  {
    namePatterns: ["covenant house"],
    data: {
      address: {
        street: "1325 N Western Ave",
        city: "Hollywood",
        state: "CA",
        zip: "90027",
      },
      contact: {
        phone: "(323) 461-3131",
        email: "info@covenanthousecalifornia.org",
      },
      amenities: [
        "Private and shared rooms",
        "Meals provided",
        "Showers and laundry",
        "Computer lab",
        "Recreation space",
        "24/7 crisis drop-in",
      ],
      services: [
        "Transitional living program",
        "Education support (GED / college prep)",
        "Job readiness and placement",
        "Mental health counseling",
        "Substance abuse treatment",
        "LGBTQ+ affirming services",
        "Legal advocacy",
        "Life skills workshops",
      ],
      rules: [
        "Youth ages 18–24 only",
        "No alcohol or drugs on premises",
        "Follow program schedule",
        "Participate in education or employment plan",
      ],
      eligibility: [
        "Youth ages 18–24",
        "Experiencing homelessness",
        "Willing to engage in programming toward stability",
      ],
      capacity: 100,
      description:
        "Covenant House California provides housing, services, and advocacy for youth experiencing homelessness, with a special focus on LGBTQ+ youth.",
    },
    description: "Covenant House California — youth homeless shelter, Hollywood",
  },
  {
    namePatterns: ["los angeles mission", "la mission"],
    data: {
      address: {
        street: "303 E 5th St",
        city: "Los Angeles",
        state: "CA",
        zip: "90013",
      },
      contact: {
        phone: "(213) 629-1227",
      },
      amenities: [
        "Dormitory beds",
        "Meals (breakfast, lunch, dinner)",
        "Showers",
        "Laundry",
        "Medical clinic",
        "Dental care",
        "Clothing distribution",
      ],
      services: [
        "Recovery programs",
        "Job training",
        "Financial literacy",
        "Housing placement assistance",
        "Veterans services",
        "Healthcare on-site",
      ],
      rules: [
        "No alcohol or drugs",
        "Program participation required for long-term stays",
        "Curfew enforced",
        "Respect community rules",
      ],
      eligibility: [
        "Men and women",
        "Must be 18 or older",
        "Experiencing homelessness",
      ],
      capacity: 500,
    },
    description: "Los Angeles Mission — Skid Row emergency shelter and recovery programs",
  },
];

/**
 * Look up enrichment data for an OSM shelter by its name and optional operator.
 * Returns null when no match is found — callers should treat null as "no enrichment."
 */
export function findShelterEnrichment(
  name: string,
  operator?: string,
): ShelterEnrichmentData | null {
  const nameLower = name.toLowerCase();
  const operatorLower = operator?.toLowerCase() ?? "";

  for (const mapping of SHELTER_ENRICHMENT_MAPPINGS) {
    const nameMatches = mapping.namePatterns.some((pattern) =>
      nameLower.includes(pattern.toLowerCase()),
    );

    const operatorMatches =
      !mapping.operatorPatterns ||
      mapping.operatorPatterns.some((pattern) =>
        operatorLower.includes(pattern.toLowerCase()),
      );

    if (nameMatches && operatorMatches) {
      return mapping.data;
    }
  }

  return null;
}
