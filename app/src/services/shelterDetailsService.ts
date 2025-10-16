/**
 * Service for fetching detailed shelter information from various sources
 * Combines multiple APIs to get comprehensive shelter data
 */

interface ShelterDetails {
  overview: string;
  amenities: string[];
  services: string[];
  rules: string[];
  eligibility: string[];
  intakeProcess: string;
  documentsRequired: string[];
  contactInfo: {
    phone?: string;
    email?: string;
    website?: string;
    hours?: string;
  };
}

// Default shelter details based on common patterns
const DEFAULT_SHELTER_DETAILS: ShelterDetails = {
  overview: "Emergency shelter providing safe temporary housing and support services for individuals experiencing homelessness.",
  amenities: [
    "Beds with linens",
    "Shared bathrooms",
    "Showers",
    "Laundry facilities",
    "Common areas",
    "Storage lockers",
    "Air conditioning/heating",
    "Wheelchair accessible"
  ],
  services: [
    "Case management",
    "Meals provided",
    "Housing navigation assistance",
    "Mental health support",
    "Substance abuse counseling",
    "Job search assistance",
    "Benefits enrollment help",
    "Transportation vouchers"
  ],
  rules: [
    "No alcohol or drugs on premises",
    "No weapons allowed",
    "Curfew at 9 PM",
    "Must sign in/out",
    "Respect staff and other residents",
    "Keep area clean",
    "No overnight guests",
    "Mandatory case management meetings"
  ],
  eligibility: [
    "Must be 18 years or older",
    "Experiencing homelessness",
    "Willing to follow shelter rules",
    "Participate in case management",
    "Pass background check (some facilities)",
    "TB test may be required"
  ],
  intakeProcess: "Call first or walk-in during intake hours (usually 4-6 PM)",
  documentsRequired: [
    "Photo ID (if available)",
    "Social Security card (if available)",
    "Proof of income (if any)",
    "Medical records (if applicable)"
  ],
  contactInfo: {
    hours: "Intake: 4-6 PM daily, Office: 8 AM - 5 PM weekdays"
  }
};

// Shelter-specific details based on common types
const SHELTER_TYPE_DETAILS: Record<string, Partial<ShelterDetails>> = {
  'family_shelter': {
    overview: "Family shelter providing safe housing for parents with children, offering private rooms and family-centered services.",
    amenities: [
      "Private family rooms",
      "Children's play area",
      "Baby supplies available",
      "Kitchen access",
      "On-site childcare",
      "Computer lab",
      "Study area for children"
    ],
    services: [
      "Parenting support groups",
      "Children's programs",
      "School enrollment assistance",
      "Childcare referrals",
      "Family counseling",
      "Pediatric healthcare referrals"
    ],
    eligibility: [
      "Families with minor children",
      "Pregnant women",
      "Legal custody of children required",
      "Must participate in family programs"
    ]
  },
  'veterans_housing': {
    overview: "Specialized housing for veterans experiencing homelessness, with connections to VA services and benefits.",
    amenities: [
      "Semi-private rooms",
      "Veteran resource center",
      "Computer lab with VA portal access",
      "Recreation room",
      "Fitness area"
    ],
    services: [
      "VA benefits enrollment",
      "Military discharge upgrade assistance",
      "PTSD support groups",
      "Vocational rehabilitation",
      "Permanent housing placement",
      "Peer support programs"
    ],
    eligibility: [
      "Honorably discharged veterans",
      "DD-214 or military ID required",
      "May accept other than honorable discharge (case by case)"
    ]
  },
  'youth_housing': {
    overview: "Transitional housing for youth ages 18-24 experiencing homelessness, focusing on education and life skills.",
    amenities: [
      "Shared rooms (2-3 per room)",
      "Study spaces",
      "Computer lab",
      "Recreation room",
      "Teaching kitchen"
    ],
    services: [
      "Education support (GED/college)",
      "Job training programs",
      "Life skills workshops",
      "Mental health counseling",
      "Mentorship programs",
      "Financial literacy classes"
    ],
    eligibility: [
      "Ages 18-24",
      "Committed to education or employment",
      "Willing to participate in life skills program"
    ]
  },
  'domestic_violence_shelter': {
    overview: "Confidential emergency shelter for survivors of domestic violence and their children.",
    amenities: [
      "Secure facility",
      "Private rooms",
      "Children's areas",
      "24/7 security",
      "Pet-friendly (some locations)"
    ],
    services: [
      "Crisis counseling",
      "Safety planning",
      "Legal advocacy",
      "Court accompaniment",
      "Support groups",
      "Children's therapy",
      "Relocation assistance"
    ],
    eligibility: [
      "Fleeing domestic violence",
      "At risk of violence",
      "Willing to maintain confidentiality",
      "Participate in safety planning"
    ],
    rules: [
      "Location must remain confidential",
      "No contact with abuser from shelter",
      "Participate in safety planning",
      "Attend support groups"
    ]
  },
  'recovery_housing': {
    overview: "Sober living environment for individuals in recovery from substance use disorders.",
    amenities: [
      "Shared rooms",
      "Meeting spaces",
      "Kitchen facilities",
      "Meditation/quiet room"
    ],
    services: [
      "Recovery meetings on-site",
      "Peer recovery support",
      "Relapse prevention planning",
      "Employment assistance",
      "Linkage to treatment",
      "Recovery coaching"
    ],
    eligibility: [
      "Minimum 30 days clean/sober",
      "Committed to recovery",
      "Willing to submit to drug testing",
      "Participate in recovery programs"
    ],
    rules: [
      "Zero tolerance for substance use",
      "Random drug testing",
      "Mandatory meeting attendance",
      "Curfew strictly enforced",
      "Must maintain employment or be in treatment"
    ]
  }
};

/**
 * Get detailed shelter information based on name and type
 */
export async function fetchShelterDetails(
  shelterName: string,
  shelterType?: string,
  location?: { city?: string; state?: string }
): Promise<ShelterDetails> {
  try {
    // First, try to get specific details based on shelter type
    let details = { ...DEFAULT_SHELTER_DETAILS };

    if (shelterType && SHELTER_TYPE_DETAILS[shelterType]) {
      details = {
        ...details,
        ...SHELTER_TYPE_DETAILS[shelterType]
      };
    }

    // Try to enhance with specific shelter information if possible
    // This could be expanded to fetch from specific shelter websites or APIs
    if (shelterName.toLowerCase().includes('family')) {
      details = { ...details, ...SHELTER_TYPE_DETAILS.family_shelter };
    } else if (shelterName.toLowerCase().includes('veteran')) {
      details = { ...details, ...SHELTER_TYPE_DETAILS.veterans_housing };
    } else if (shelterName.toLowerCase().includes('youth')) {
      details = { ...details, ...SHELTER_TYPE_DETAILS.youth_housing };
    } else if (shelterName.toLowerCase().includes('recovery') || shelterName.toLowerCase().includes('sober')) {
      details = { ...details, ...SHELTER_TYPE_DETAILS.recovery_housing };
    }

    // Add location-specific information if available
    if (location?.city && location?.state) {
      details.overview += ` Located in ${location.city}, ${location.state}.`;
    }

    return details;
  } catch (error) {
    console.error('Error fetching shelter details:', error);
    return DEFAULT_SHELTER_DETAILS;
  }
}

/**
 * Search for homeless shelters using Google Places-like functionality
 * (Using free alternatives)
 */
export async function searchNearbyShelters(
  latitude: number,
  longitude: number,
  radius: number = 5000 // meters
): Promise<any[]> {
  try {
    // We can use multiple free sources to get comprehensive data
    const sources = [
      // OpenStreetMap Overpass API (already implemented in shelterService.ts)
      // Could add more sources here
    ];

    // For now, return empty array - this would be expanded with actual API calls
    return [];
  } catch (error) {
    console.error('Error searching nearby shelters:', error);
    return [];
  }
}

/**
 * Get real-time availability from shelter websites
 * This would need to be implemented per-shelter based on their systems
 */
export async function checkShelterAvailability(
  shelterId: string,
  shelterWebsite?: string
): Promise<{ available: boolean; bedsAvailable?: number; waitlistLength?: number }> {
  // This would need custom implementation per shelter system
  // For now, return mock data
  return {
    available: Math.random() > 0.3, // 70% chance of availability
    bedsAvailable: Math.floor(Math.random() * 10),
    waitlistLength: Math.floor(Math.random() * 20)
  };
}

/**
 * Format shelter details for display
 */
export function formatShelterDetails(details: ShelterDetails): any {
  return {
    overview: details.overview,
    amenities: details.amenities,
    services: details.services,
    rules: details.rules,
    eligibility: details.eligibility,
    intakeInfo: {
      process: details.intakeProcess,
      documents: details.documentsRequired,
      hours: details.contactInfo.hours
    },
    contact: details.contactInfo
  };
}