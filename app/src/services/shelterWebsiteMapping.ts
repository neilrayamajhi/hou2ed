/**
 * Shelter Website Mapping Service
 *
 * This service provides accurate website URLs for known shelter organizations
 * that may not have proper website data in OpenStreetMap.
 *
 * Why this exists:
 * - OpenStreetMap data often lacks websites or has outdated URLs
 * - Some facilities use location-specific URLs that 404
 * - We want to provide users with working, helpful links
 */

export interface ShelterWebsiteUrls {
  primary: string;
  fallbacks: string[];
}

interface ShelterWebsiteMapping {
  namePatterns: string[];
  operatorPatterns?: string[];
  urls: ShelterWebsiteUrls;
  description?: string;
}

// Known shelter organizations and their websites
export const SHELTER_WEBSITE_MAPPINGS: ShelterWebsiteMapping[] = [
  // Hope the Mission (formerly Hope of the Valley) - Specific shelters first
  {
    namePatterns: [
      "alexandria tiny home village",
      "chandler boulevard tiny home village",  // Add "boulevard" variant
      "chandler tiny home village",
      "whitsett west tiny home village",  // Add "west" variant
      "whitsett tiny home village",
      "tarzana tiny home village",
      "reseda tiny home village",
      "arroyo seco tiny home village"
    ],
    urls: {
      primary: "https://hopethemission.org/our-programs/tiny-homes-villages/",
      fallbacks: ["https://hopethemission.org"]
    },
    description: "Hope the Mission Tiny Home Villages"
  },
  {
    namePatterns: [
      "van nuys family bridge housing",
      "van nuys shelter",
      "van nuys bridge"
    ],
    urls: {
      primary: "https://hopethemission.org/our-programs/",
      fallbacks: ["https://hopethemission.org"]
    },
    description: "Hope the Mission Van Nuys"
  },
  // General Hope the Mission patterns - catch-all
  {
    namePatterns: [
      "tiny home", "tiny homes", "tiny house",
      "cabin community",
      "hope the mission"  // Catch any shelter with Hope the Mission in name
    ],
    operatorPatterns: ["hope the mission", "hope of the valley"],
    urls: {
      primary: "https://hopethemission.org/our-programs/tiny-homes-villages/",
      fallbacks: ["https://hopethemission.org"]
    },
    description: "Hope the Mission Tiny Home Villages"
  },
  {
    namePatterns: ["hope the mission", "hope of the valley"],
    operatorPatterns: ["hope the mission", "hope of the valley"],
    urls: {
      primary: "https://hopethemission.org",
      fallbacks: []
    },
    description: "Hope the Mission main website"
  },

  // Los Angeles Homeless Services Authority (LAHSA)
  {
    namePatterns: ["lahsa", "los angeles homeless services"],
    urls: {
      primary: "https://www.lahsa.org",
      fallbacks: []
    },
    description: "LA Homeless Services Authority"
  },

  // The Midnight Mission
  {
    namePatterns: ["midnight mission"],
    urls: {
      primary: "https://www.midnightmission.org",
      fallbacks: []
    },
    description: "The Midnight Mission"
  },

  // Union Rescue Mission
  {
    namePatterns: ["union rescue mission", "urm"],
    urls: {
      primary: "https://urm.org",
      fallbacks: []
    },
    description: "Union Rescue Mission"
  },

  // Los Angeles Mission
  {
    namePatterns: ["los angeles mission", "la mission"],
    urls: {
      primary: "https://losangelesmission.org",
      fallbacks: []
    },
    description: "Los Angeles Mission"
  },

  // Downtown Women's Center
  {
    namePatterns: ["downtown women's center", "dwc"],
    urls: {
      primary: "https://downtownwomenscenter.org",
      fallbacks: []
    },
    description: "Downtown Women's Center"
  },

  // PATH (People Assisting the Homeless)
  {
    namePatterns: ["path", "people assisting the homeless"],
    urls: {
      primary: "https://www.epath.org",
      fallbacks: []
    },
    description: "PATH - People Assisting the Homeless"
  },

  // The Dream Center
  {
    namePatterns: ["dream center"],
    urls: {
      primary: "https://dreamcenter.org",
      fallbacks: []
    },
    description: "The Dream Center"
  },

  // Safe Place for Youth
  {
    namePatterns: ["safe place for youth", "spy"],
    urls: {
      primary: "https://www.safeplaceforyouth.org",
      fallbacks: []
    },
    description: "Safe Place for Youth"
  },

  // Covenant House California
  {
    namePatterns: ["covenant house"],
    urls: {
      primary: "https://www.covenanthousecalifornia.org",
      fallbacks: []
    },
    description: "Covenant House California"
  },

  // The Salvation Army
  {
    namePatterns: ["salvation army"],
    urls: {
      primary: "https://www.salvationarmyusa.org",
      fallbacks: []
    },
    description: "The Salvation Army"
  },

  // St. Vincent de Paul
  {
    namePatterns: ["st vincent de paul", "saint vincent de paul", "svdp"],
    urls: {
      primary: "https://svdpla.org",
      fallbacks: []
    },
    description: "St. Vincent de Paul LA"
  },

  // Good Shepherd Center
  {
    namePatterns: ["good shepherd center", "good shepherd shelter"],
    urls: {
      primary: "https://goodshepherdcenter.org",
      fallbacks: []
    },
    description: "Good Shepherd Center"
  },

  // Weingart Center
  {
    namePatterns: ["weingart center", "weingart"],
    urls: {
      primary: "https://weingart.org",
      fallbacks: []
    },
    description: "Weingart Center"
  },

  // Harbor Interfaith Services
  {
    namePatterns: ["harbor interfaith"],
    urls: {
      primary: "https://www.harborinterfaith.org",
      fallbacks: []
    },
    description: "Harbor Interfaith Services"
  },

  // OPCC (Ocean Park Community Center)
  {
    namePatterns: ["opcc", "ocean park community center"],
    urls: {
      primary: "https://www.opcc.net",
      fallbacks: []
    },
    description: "Ocean Park Community Center"
  },

  // Venice Community Housing
  {
    namePatterns: ["venice community housing", "vch"],
    urls: {
      primary: "https://www.vchcorp.org",
      fallbacks: []
    },
    description: "Venice Community Housing"
  },

  // Ascencia
  {
    namePatterns: ["ascencia"],
    urls: {
      primary: "https://ascenciaca.org",
      fallbacks: []
    },
    description: "Ascencia"
  },

  // Family Promise
  {
    namePatterns: ["family promise"],
    urls: {
      primary: "https://familypromise.org",
      fallbacks: []
    },
    description: "Family Promise"
  },

  // LA Family Housing
  {
    namePatterns: ["la family housing", "los angeles family housing", "lafh"],
    urls: {
      primary: "https://lafh.org",
      fallbacks: []
    },
    description: "LA Family Housing"
  },

  // Jovenes Inc
  {
    namePatterns: ["jovenes"],
    urls: {
      primary: "https://www.jovenesinc.org",
      fallbacks: []
    },
    description: "Jovenes Inc - Youth Services"
  },

  // Chrysalis
  {
    namePatterns: ["chrysalis"],
    urls: {
      primary: "https://www.changelives.org",
      fallbacks: []
    },
    description: "Chrysalis"
  },

  // The People Concern (formerly OPCC & Lamp Community)
  {
    namePatterns: ["the people concern", "lamp community"],
    urls: {
      primary: "https://www.thepeopleconcern.org",
      fallbacks: []
    },
    description: "The People Concern"
  },

  // Hollywood Community Housing Corporation
  {
    namePatterns: ["hollywood community housing", "hchc"],
    urls: {
      primary: "https://www.hollywoodhousing.org",
      fallbacks: []
    },
    description: "Hollywood Community Housing Corporation"
  },

  // Skid Row Housing Trust
  {
    namePatterns: ["skid row housing trust", "srht"],
    urls: {
      primary: "https://skidrow.org",
      fallbacks: []
    },
    description: "Skid Row Housing Trust"
  },

  // SRO Housing Corporation
  {
    namePatterns: ["sro housing"],
    urls: {
      primary: "https://www.srohousing.org",
      fallbacks: []
    },
    description: "SRO Housing Corporation"
  },

  // Step Up on Second
  {
    namePatterns: ["step up on second", "step up"],
    urls: {
      primary: "https://www.stepuponsecond.org",
      fallbacks: []
    },
    description: "Step Up on Second"
  },

  // Hillsides
  {
    namePatterns: ["hillsides"],
    urls: {
      primary: "https://www.hillsides.org",
      fallbacks: []
    },
    description: "Hillsides"
  },

  // Hathaway-Sycamores
  {
    namePatterns: ["hathaway sycamores", "hathaway-sycamores"],
    urls: {
      primary: "https://www.hathaway-sycamores.org",
      fallbacks: []
    },
    description: "Hathaway-Sycamores"
  },

  // A Community of Friends
  {
    namePatterns: ["community of friends", "acof"],
    urls: {
      primary: "https://www.acof.org",
      fallbacks: []
    },
    description: "A Community of Friends"
  },

  // Brilliant Corners
  {
    namePatterns: ["brilliant corners"],
    urls: {
      primary: "https://www.brilliantcorners.org",
      fallbacks: []
    },
    description: "Brilliant Corners"
  },

  // Housing Works
  {
    namePatterns: ["housing works"],
    urls: {
      primary: "https://housingworksla.org",
      fallbacks: []
    },
    description: "Housing Works"
  },

  // Shelter Partnership
  {
    namePatterns: ["shelter partnership"],
    urls: {
      primary: "https://www.shelterpartnership.org",
      fallbacks: []
    },
    description: "Shelter Partnership"
  },

  // Additional LA-area shelters
  {
    namePatterns: ["fred jordan mission", "fjm"],
    urls: {
      primary: "https://www.fjm.org",
      fallbacks: []
    },
    description: "Fred Jordan Mission"
  },
  {
    namePatterns: ["angel hanz"],
    urls: {
      primary: "https://www.angelhanz.org",
      fallbacks: []
    },
    description: "Angel Hanz for the Homeless"
  },
  {
    namePatterns: ["illumination foundation"],
    urls: {
      primary: "https://www.ifhomeless.org",
      fallbacks: []
    },
    description: "Illumination Foundation"
  },
  {
    namePatterns: ["mary's shelter", "mary's kitchen"],
    urls: {
      primary: "https://www.maryskitchen.org",
      fallbacks: []
    },
    description: "Mary's Kitchen"
  },
  {
    namePatterns: ["orange county rescue mission", "ocrm"],
    urls: {
      primary: "https://www.rescuemission.org",
      fallbacks: []
    },
    description: "Orange County Rescue Mission"
  },
  {
    namePatterns: ["long beach rescue mission", "lbrm"],
    urls: {
      primary: "https://www.lbrm.org",
      fallbacks: []
    },
    description: "Long Beach Rescue Mission"
  },
  {
    namePatterns: ["san fernando valley rescue mission", "sfvrm"],
    urls: {
      primary: "https://www.sfvrescuemission.org",
      fallbacks: []
    },
    description: "San Fernando Valley Rescue Mission"
  },
  {
    namePatterns: ["antelope valley"],
    operatorPatterns: ["los angeles homeless services"],
    urls: {
      primary: "https://www.lahsa.org",
      fallbacks: []
    },
    description: "LAHSA Antelope Valley"
  },
  {
    namePatterns: ["bridge home", "bridge housing"],
    urls: {
      primary: "https://www.lahsa.org/bridgehome",
      fallbacks: []
    },
    description: "A Bridge Home Program"
  },
  {
    namePatterns: ["project roomkey", "roomkey"],
    urls: {
      primary: "https://covid19.lacounty.gov/project-roomkey/",
      fallbacks: []
    },
    description: "Project Roomkey"
  },
  {
    namePatterns: ["homekey"],
    urls: {
      primary: "https://www.hcd.ca.gov/grants-and-funding/homekey",
      fallbacks: []
    },
    description: "Project Homekey"
  }

  // Add more as we discover them through usage
];

/**
 * Find the appropriate website for a shelter based on its name and operator
 * @param name - The shelter name from OpenStreetMap
 * @param operator - The operator field from OpenStreetMap (optional)
 * @returns Website URLs object if found, null otherwise
 */
export function findShelterWebsite(name: string, operator?: string): ShelterWebsiteUrls | null {
  const nameLower = name.toLowerCase();
  const operatorLower = operator?.toLowerCase() || "";

  // Check each mapping
  for (const mapping of SHELTER_WEBSITE_MAPPINGS) {
    // Check name patterns
    const nameMatches = mapping.namePatterns.some(pattern => {
      const matches = nameLower.includes(pattern.toLowerCase());
      if (matches) {
        console.log(`      ✅ Pattern "${pattern}" matches "${nameLower}"`);
      }
      return matches;
    });

    // Check operator patterns if provided
    const operatorMatches = !mapping.operatorPatterns ||
      mapping.operatorPatterns.some(pattern =>
        operatorLower.includes(pattern.toLowerCase())
      );

    // If both match (or operator not required), return the URLs
    if (nameMatches && operatorMatches) {
      console.log(`   ✅ Found website mapping for ${name}`);
      return mapping.urls;
    }
  }

  console.log(`      ❌ No mapping found for "${name}"`);
  return null;
}

/**
 * Validate and clean a website URL
 * @param url - The URL to validate
 * @returns Cleaned URL or empty string if invalid
 */
export function validateWebsiteUrl(url: string): string {
  if (!url) return "";

  // Remove OpenStreetMap URLs
  if (url.includes("openstreetmap.org") ||
      url.includes("osm.org") ||
      url.includes("wiki.openstreetmap.org") ||
      url.startsWith("osm:")) {
    return "";
  }

  // Add https:// if missing
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    if (url.includes(".") && !url.includes(" ")) {
      url = `https://${url}`;
    } else {
      return "";
    }
  }

  // Validate URL structure
  try {
    const urlObj = new URL(url);

    // Final check - no OSM domains
    if (urlObj.hostname.includes("openstreetmap") ||
        urlObj.hostname.includes("osm.org")) {
      return "";
    }

    return url;
  } catch {
    return "";
  }
}