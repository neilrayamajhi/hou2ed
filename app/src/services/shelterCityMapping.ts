/**
 * Helper to get city name for known shelters
 * This helps when OpenStreetMap doesn't have city data
 */

interface ShelterCityMapping {
  namePatterns: string[];
  city: string;
}

const SHELTER_CITY_MAPPINGS: ShelterCityMapping[] = [
  // Hope the Mission shelters
  {
    namePatterns: ["alexandria", "alexandria park"],
    city: "Los Angeles"
  },
  {
    namePatterns: ["chandler", "chandler boulevard"],
    city: "North Hollywood"
  },
  {
    namePatterns: ["whitsett"],
    city: "North Hollywood"
  },
  {
    namePatterns: ["tarzana"],
    city: "Tarzana"
  },
  {
    namePatterns: ["reseda"],
    city: "Reseda"
  },
  {
    namePatterns: ["van nuys"],
    city: "Van Nuys"
  },
  {
    namePatterns: ["arroyo seco"],
    city: "Highland Park"
  },
  // Other LA area locations
  {
    namePatterns: ["hollywood"],
    city: "Hollywood"
  },
  {
    namePatterns: ["downtown", "skid row"],
    city: "Downtown LA"
  },
  {
    namePatterns: ["santa monica"],
    city: "Santa Monica"
  },
  {
    namePatterns: ["venice"],
    city: "Venice"
  },
  {
    namePatterns: ["long beach"],
    city: "Long Beach"
  },
  {
    namePatterns: ["pasadena"],
    city: "Pasadena"
  },
  {
    namePatterns: ["glendale"],
    city: "Glendale"
  },
  {
    namePatterns: ["burbank"],
    city: "Burbank"
  }
];

/**
 * Find city name based on shelter name patterns
 * @param shelterName The name of the shelter
 * @returns City name if found, null otherwise
 */
export function findShelterCity(shelterName: string): string | null {
  const nameLower = shelterName.toLowerCase();

  for (const mapping of SHELTER_CITY_MAPPINGS) {
    if (mapping.namePatterns.some(pattern => nameLower.includes(pattern))) {
      return mapping.city;
    }
  }

  return null;
}