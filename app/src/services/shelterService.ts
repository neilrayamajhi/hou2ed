/**
 * Service for fetching ONLY homeless shelter data from OpenStreetMap
 * Data sources: OpenStreetMap Overpass API
 * Filters applied:
 * - Must be a verified homeless shelter (not food bank, community center, etc.)
 * - Must have a name
 * - Website is optional (no longer required)
 * - OpenStreetMap URLs are filtered out (never shown as shelter websites)
 * - Excludes animal shelters, picnic shelters, bus shelters, etc.
 * - Uses shelterWebsiteMapping.ts for known organizations
 */

import {
  findShelterWebsite,
  validateWebsiteUrl,
  ShelterWebsiteUrls,
} from "./shelterWebsiteMapping";
import { findShelterCity } from "./shelterCityMapping";
import { findShelterEnrichment } from "./shelterEnrichmentMapping";
import { fetchWikipediaEnrichment } from "./wikipediaEnrichment";

interface OSMShelter {
  id: number;
  type: string;
  lat?: number; // Present for nodes
  lon?: number; // Present for nodes
  center?: {
    // Present for ways (buildings/areas)
    lat: number;
    lon: number;
  };
  tags: {
    name?: string;
    amenity?: string;
    social_facility?: string;
    "social_facility:for"?: string;
    phone?: string;
    "contact:phone"?: string;
    email?: string;
    "contact:email"?: string;
    website?: string;
    "contact:website"?: string;
    "addr:street"?: string;
    "addr:housenumber"?: string;
    "addr:city"?: string;
    "addr:state"?: string;
    "addr:postcode"?: string;
    opening_hours?: string;
    capacity?: string;
    beds?: string;
    wheelchair?: string;
    operator?: string;
    description?: string;
    image?: string;
    "image:0"?: string;
    wikidata?: string;
    wikipedia?: string;
    "service:domestic_violence"?: string;
    "service:mental_health"?: string;
    "service:addiction"?: string;
    "healthcare:speciality"?: string;
  };
}

/**
 * Generate a deterministic seed from a string for unique placeholders
 */
function generateSeedFromId(id: number): number {
  // Simple hash function to convert ID to seed
  let hash = 0;
  const str = id.toString();
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get image URL from OSM tags or return empty string
 */
function getImageUrl(tags: OSMShelter["tags"], osmId: number): string {
  // Check if there's a direct image URL in tags
  if (tags.image && tags.image.startsWith("http")) {
    return tags.image;
  }

  if (tags["image:0"] && tags["image:0"].startsWith("http")) {
    return tags["image:0"];
  }

  // If there's a Wikimedia Commons link, construct image URL
  if (tags.image && tags.image.includes("File:")) {
    const filename = tags.image.replace("File:", "");
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=400`;
  }

  // Return empty string instead of random placeholder
  // The UI should handle missing images gracefully
  return "";
}

/**
 * Build specific description from OSM tags
 */
function buildDescription(
  tags: OSMShelter["tags"],
  name: string,
  city: string,
): string {
  // Start with explicit description if available
  if (tags.description) {
    return `${tags.description} Contact directly for current availability, requirements, and intake procedures.`;
  }

  const parts: string[] = [];

  // Start with facility name and location for uniqueness
  parts.push(`${name} is located in ${city || "the area"}`);

  // Type of facility - all are homeless shelters
  if (tags.social_facility === "homeless_shelter") {
    parts.push("This emergency homeless shelter provides temporary housing");
  } else if (tags.amenity === "shelter") {
    parts.push("This emergency homeless shelter provides crisis housing");
  } else {
    parts.push("This homeless shelter offers emergency housing assistance");
  }

  // Who it serves - be more specific
  if (tags["social_facility:for"]) {
    const serves = tags["social_facility:for"];
    const servesGroups: string[] = [];
    if (serves.includes("veteran")) servesGroups.push("veterans");
    if (serves.includes("women")) servesGroups.push("women");
    if (serves.includes("men")) servesGroups.push("men");
    if (serves.includes("family") || serves.includes("families"))
      servesGroups.push("families with children");
    if (serves.includes("youth")) servesGroups.push("youth (under 25)");
    if (serves.includes("homeless"))
      servesGroups.push("individuals experiencing homelessness");

    if (servesGroups.length > 0) {
      parts.push(`specifically for ${servesGroups.join(", ")}`);
    }
  }

  // Operator - add credibility and attribution
  if (tags.operator) {
    parts.push(`The facility is operated by ${tags.operator}`);
  }

  // Website - important for verification and more info
  if (tags.website || tags["contact:website"]) {
    const websiteUrl = tags.website || tags["contact:website"];
    // Extract organization name from URL if possible
    try {
      const url = new URL(websiteUrl);
      const orgName = url.hostname.replace(/^www\./, "").split(".")[0];
      // Capitalize first letter
      const displayName = orgName.charAt(0).toUpperCase() + orgName.slice(1);

      if (
        !tags.operator ||
        !tags.operator.toLowerCase().includes(orgName.toLowerCase())
      ) {
        parts.push(
          `Visit their website for more information and current availability`,
        );
      }
    } catch (e) {
      // Invalid URL, skip
    }
  }

  // Capacity - important detail
  const capacity = tags.capacity || tags.beds;
  if (capacity) {
    const capacityNum = parseInt(capacity);
    if (capacityNum > 100) {
      parts.push(
        `with a large capacity of ${capacity} beds available to serve the community`,
      );
    } else if (capacityNum > 20) {
      parts.push(`with capacity for ${capacity} residents`);
    } else {
      parts.push(`with ${capacity} beds in a smaller, more intimate setting`);
    }
  }

  // Services - crucial information
  const services: string[] = [];
  if (tags["service:mental_health"])
    services.push("on-site mental health counseling");
  if (tags["service:addiction"])
    services.push("substance abuse recovery programs");
  if (tags["service:domestic_violence"])
    services.push("domestic violence support and safety planning");
  if (tags["healthcare:speciality"])
    services.push("specialized healthcare services");

  if (services.length > 0) {
    parts.push(`Services include: ${services.join(", ")}`);
  }

  // Accessibility - important for many
  const accessibility: string[] = [];
  if (tags.wheelchair === "yes")
    accessibility.push("wheelchair accessible facilities");
  if (tags.wheelchair === "limited")
    accessibility.push("limited wheelchair access");

  if (accessibility.length > 0) {
    parts.push(
      `The facility features ${accessibility.join(", ")} to accommodate diverse needs`,
    );
  }

  // Hours/availability info
  if (tags.opening_hours && tags.opening_hours !== "24/7") {
    parts.push(`Operating hours: ${tags.opening_hours}`);
  } else if (tags.opening_hours === "24/7") {
    parts.push("Open 24 hours a day, 7 days a week for emergency intake");
  }

  const description = parts.join(". ") + ".";

  // Add personalized call-to-action
  return `${description} Please call ahead to check current bed availability, confirm eligibility requirements, and schedule an intake appointment.`;
}

/**
 * Fetch with timeout wrapper
 * Returns a fetch promise that will reject after timeoutMs
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if ((error as Error).name === "AbortError") {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * Custom error for non-retryable client errors
 */
class ClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClientError";
  }
}

/**
 * Retry a fetch request with exponential backoff
 * Only retries server errors (5xx), not client errors (4xx)
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 2,
  timeoutMs: number = 30000,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `🌐 OSM API attempt ${attempt + 1}/${maxRetries + 1} (timeout: ${timeoutMs}ms)`,
      );
      const response = await fetchWithTimeout(url, options, timeoutMs);

      if (!response.ok) {
        // For 5xx errors (server errors), retry. For 4xx (client errors), don't retry
        if (response.status >= 500) {
          throw new Error(`HTTP ${response.status}: Server error`);
        } else {
          // Don't retry 4xx errors - throw ClientError to skip retries
          throw new ClientError(`HTTP ${response.status}: Client error`);
        }
      }

      console.log(`✅ OSM API request succeeded on attempt ${attempt + 1}`);
      return response;
    } catch (error) {
      lastError = error as Error;
      console.warn(
        `⚠️ OSM API attempt ${attempt + 1} failed:`,
        lastError.message,
      );

      // Don't retry ClientError (4xx) or if this is the last attempt
      if (error instanceof ClientError) {
        console.log(`   Client error - not retrying`);
        throw error;
      }

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s...
        const delayMs = 1000 * Math.pow(2, attempt);
        console.log(`   Retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  // All retries failed
  throw lastError || new Error("Unknown error during fetch");
}

export async function fetchRealShelters(
  latitude: number,
  longitude: number,
  radiusKm: number = 10,
): Promise<any[]> {
  try {
    // Overpass API query for homeless shelters
    // Cast a wider net in the query, then filter programmatically
    // IMPORTANT: "out center" adds center coordinates to way elements (buildings/areas)
    const query = `
      [out:json][timeout:25];
      (
        node["social_facility"="homeless_shelter"](around:${radiusKm * 1000},${latitude},${longitude});
        node["social_facility"="shelter"](around:${radiusKm * 1000},${latitude},${longitude});
        node["amenity"="shelter"](around:${radiusKm * 1000},${latitude},${longitude});
        node["amenity"="social_facility"]["social_facility:for"~"homeless"](around:${radiusKm * 1000},${latitude},${longitude});
        way["social_facility"="homeless_shelter"](around:${radiusKm * 1000},${latitude},${longitude});
        way["social_facility"="shelter"](around:${radiusKm * 1000},${latitude},${longitude});
        way["amenity"="shelter"](around:${radiusKm * 1000},${latitude},${longitude});
        way["amenity"="social_facility"]["social_facility:for"~"homeless"](around:${radiusKm * 1000},${latitude},${longitude});
      );
      out body center;
      >;
      out skel qt;
    `.trim();

    // Use public Overpass API endpoint
    const url = "https://overpass-api.de/api/interpreter";

    // Use retry logic with timeout to handle network issues during signup
    const response = await fetchWithRetry(
      url,
      {
        method: "POST",
        body: `data=${encodeURIComponent(query)}`,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
      2, // Max 2 retries (3 total attempts)
      30000, // 30 second timeout per attempt
    );

    const data = await response.json();

    console.log(
      `📍 OSM API returned ${data.elements?.length || 0} total elements`,
    );

    // Transform OSM data to our format
    const validElements = data.elements
      .filter((element: any) => {
        // Only include named places
        if (!element.tags?.name) {
          console.log("❌ Filtered out: No name");
          return false;
        }

        const tags = element.tags;
        const name = tags.name?.toLowerCase() || "";

        // STRICT EXCLUSIONS - These are definitely NOT homeless shelters

        // Exclude non-shelter social facilities
        if (tags.social_facility === "food_bank") {
          console.log(`❌ Filtered out: ${tags.name} - Food bank`);
          return false;
        }
        if (tags.social_facility === "group_home") {
          console.log(`❌ Filtered out: ${tags.name} - Group home`);
          return false;
        }
        if (tags.social_facility === "workshop") {
          console.log(`❌ Filtered out: ${tags.name} - Workshop`);
          return false;
        }
        if (tags.social_facility === "assisted_living") {
          console.log(`❌ Filtered out: ${tags.name} - Assisted living`);
          return false;
        }
        if (tags.social_facility === "nursing_home") {
          console.log(`❌ Filtered out: ${tags.name} - Nursing home`);
          return false;
        }
        if (tags.social_facility === "day_care") {
          console.log(`❌ Filtered out: ${tags.name} - Day care`);
          return false;
        }

        // Exclude community/social centers
        if (tags.amenity === "community_centre") {
          console.log(`❌ Filtered out: ${tags.name} - Community centre`);
          return false;
        }
        if (tags.amenity === "social_centre") {
          console.log(`❌ Filtered out: ${tags.name} - Social centre`);
          return false;
        }
        if (tags.amenity === "social_facility" && !tags.social_facility) {
          console.log(
            `❌ Filtered out: ${tags.name} - Generic social facility`,
          );
          return false;
        }

        // Exclude non-human shelters (bus stops, picnic shelters, etc.)
        if (tags.highway === "bus_stop") {
          console.log(`❌ Filtered out: ${tags.name} - Bus stop`);
          return false;
        }
        if (
          tags.amenity === "shelter" &&
          tags.shelter_type === "picnic_shelter"
        ) {
          console.log(`❌ Filtered out: ${tags.name} - Picnic shelter`);
          return false;
        }
        if (
          tags.amenity === "shelter" &&
          tags.shelter_type === "weather_shelter"
        ) {
          console.log(`❌ Filtered out: ${tags.name} - Weather shelter`);
          return false;
        }
        if (
          tags.amenity === "shelter" &&
          tags.shelter_type === "public_transport"
        ) {
          console.log(
            `❌ Filtered out: ${tags.name} - Public transport shelter`,
          );
          return false;
        }

        // Exclude animal shelters
        if (
          name.includes("animal") ||
          name.includes("pet") ||
          name.includes("dog") ||
          name.includes("cat")
        ) {
          console.log(`❌ Filtered out: ${tags.name} - Likely animal shelter`);
          return false;
        }

        // POSITIVE VALIDATION - Must match at least ONE of these criteria

        // Criterion 1: Explicitly tagged as homeless shelter
        const isExplicitHomelessShelter =
          tags.social_facility === "homeless_shelter";

        // Criterion 2: Social facility specifically for homeless people
        const isSocialFacilityForHomeless =
          tags.social_facility === "shelter" &&
          (tags["social_facility:for"] === "homeless" ||
            tags["social_facility:for"]?.includes("homeless"));

        // Criterion 3: Amenity shelter with homeless designation
        const isAmenityShelterForHomeless =
          tags.amenity === "shelter" &&
          (tags["social_facility:for"] === "homeless" ||
            tags["social_facility:for"]?.includes("homeless"));

        // Criterion 4: Name strongly suggests homeless shelter
        const nameIndicatesHomelessShelter =
          tags.amenity === "shelter" &&
          (name.includes("homeless") ||
            name.includes("emergency shelter") ||
            name.includes("crisis") ||
            name.includes("transitional") ||
            name.includes("rescue mission"));

        const isValidShelter =
          isExplicitHomelessShelter ||
          isSocialFacilityForHomeless ||
          isAmenityShelterForHomeless ||
          nameIndicatesHomelessShelter;

        if (!isValidShelter) {
          console.log(
            `❌ Filtered out: ${tags.name} - Doesn't meet shelter criteria`,
          );
          console.log(`   Tags:`, {
            amenity: tags.amenity,
            social_facility: tags.social_facility,
            "social_facility:for": tags["social_facility:for"],
            shelter_type: tags.shelter_type,
          });
          return false;
        }

        // Website is now optional - we'll validate it later in the map function
        // This allows us to include more shelters in the results
        const websiteUrl = tags.website || tags["contact:website"] || "";
        if (websiteUrl) {
          console.log(`   Has website tag: ${websiteUrl}`);
        } else {
          console.log(`   No website in OSM data`);
        }

        console.log(`✅ Accepted: ${tags.name} - Verified homeless shelter`);
        return true;
      });

    // Process shelters in batches of 5 to avoid flooding the Wikipedia API with
    // 50+ simultaneous requests (which risks rate limiting and a traffic jam).
    // Each batch runs in parallel; batches run one after another.
    const BATCH_SIZE = 5;
    const allResults: (any | null)[] = [];
    for (let i = 0; i < validElements.length; i += BATCH_SIZE) {
      const batch = validElements.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(batch.map(async (element: OSMShelter): Promise<any | null> => {
        const tags = element.tags;

        // Extract coordinates - handle both nodes (lat/lon) and ways (center.lat/center.lon)
        const shelterLat = element.lat ?? element.center?.lat;
        const shelterLon = element.lon ?? element.center?.lon;

        // Validate coordinates before calculating distance
        const hasValidShelterCoords =
          shelterLat !== undefined &&
          shelterLon !== undefined &&
          !Number.isNaN(shelterLat) &&
          !Number.isNaN(shelterLon) &&
          shelterLat !== 0 &&
          shelterLon !== 0;

        const hasValidUserCoords =
          latitude &&
          longitude &&
          !Number.isNaN(latitude) &&
          !Number.isNaN(longitude);

        console.log(
          `🔍 Distance validation for ${tags.name}:`,
          `\n   Element type: ${element.type}`,
          `\n   User coords: (${latitude}, ${longitude}) - valid: ${hasValidUserCoords}`,
          `\n   Shelter coords: (${shelterLat}, ${shelterLon}) - valid: ${hasValidShelterCoords}`,
        );

        let distance: number | undefined = undefined;

        if (hasValidUserCoords && hasValidShelterCoords) {
          const calculatedDistance = calculateDistance(
            latitude,
            longitude,
            shelterLat,
            shelterLon,
          );
          // Only set distance if calculation succeeded (not NaN)
          distance = !Number.isNaN(calculatedDistance)
            ? calculatedDistance
            : undefined;
        } else {
          console.warn(
            `   ⚠️ Skipping distance calculation - invalid coordinates`,
          );
        }

        console.log(`   📍 Final distance: ${distance} miles`);

        // Determine specific type of homeless shelter
        let type = "emergency_shelter";
        if (tags["social_facility:for"]?.includes("veteran")) {
          type = "veterans_housing";
        } else if (tags["social_facility:for"]?.includes("youth")) {
          type = "youth_housing";
        } else if (tags["social_facility:for"]?.includes("women")) {
          type = "domestic_violence_shelter";
        }

        // Get image from OSM tags or generate unique placeholder
        const coverImage = getImageUrl(tags, element.id);

        // Extract name and city first for description building
        const name = tags.name || "Unnamed Shelter";
        // Try multiple sources for city data
        let city =
          tags["addr:city"] ||
          tags["addr:suburb"] ||
          tags["addr:neighbourhood"] ||
          tags["addr:district"] ||
          "";

        // If no city from OSM, try to get it from our mapping
        if (!city) {
          city = findShelterCity(name) || "Los Angeles"; // Default to LA
        }

        // Build specific description from tags
        const description = buildDescription(tags, name, city);

        // Get all contact information
        const phone = tags.phone || tags["contact:phone"];
        const email = tags.email || tags["contact:email"];
        let website = tags.website || tags["contact:website"] || "";
        let websiteUrls: ShelterWebsiteUrls | null = null;

        // FIRST: Check our mapping for known shelters (priority over OSM data)
        console.log(
          `   🔍 Checking mapping for: "${tags.name || ""}" with operator: "${tags.operator || ""}"`,
        );
        const mappedUrls = findShelterWebsite(tags.name || "", tags.operator);
        if (mappedUrls) {
          // We have a known mapping - use it regardless of OSM data
          websiteUrls = mappedUrls;
          website = mappedUrls.primary; // For backward compatibility
          console.log(`   ✅ OVERRIDE: Using mapped website for ${tags.name}`);
          console.log(`      Primary: ${website}`);
          console.log(
            `      Fallbacks: ${mappedUrls.fallbacks.join(", ") || "None"}`,
          );
          if (tags.website || tags["contact:website"]) {
            console.log(
              `      (Replacing OSM URL: ${tags.website || tags["contact:website"]})`,
            );
          }
        } else {
          // No mapping found, validate and use OSM URL if available
          website = validateWebsiteUrl(website);

          if (website) {
            // Use OSM URL but try to add intelligent fallbacks
            const urlObj = new URL(website);
            const baseUrl = `${urlObj.protocol}//${urlObj.hostname}`;

            // Only add baseUrl as fallback if it's different from the primary
            if (website !== baseUrl && website !== baseUrl + "/") {
              websiteUrls = {
                primary: website,
                fallbacks: [baseUrl], // Add main domain as fallback
              };
              console.log(
                `   📍 Using OSM website with fallback for ${tags.name}`,
              );
            } else {
              websiteUrls = {
                primary: website,
                fallbacks: [],
              };
              console.log(`   📍 Using OSM website for ${tags.name}`);
            }
          }
        }

        // Log the final decision
        if (websiteUrls) {
          console.log(
            `   ✅ Final website for ${tags.name}: ${websiteUrls.primary}`,
          );
          if (websiteUrls.fallbacks.length > 0) {
            console.log(`      Fallbacks: ${websiteUrls.fallbacks.join(", ")}`);
          }
        } else {
          console.log(`   ℹ️ ${tags.name} will have no website link`);
        }

        console.log(`📋 ${tags.name} (ID: osm-${element.id}) contact info:`, {
          phone: phone || "none",
          email: email || "none",
          website: website || "none",
        });

        // Verify the tags are correct
        if (website) {
          console.log(`   ✓ Website found in tags: ${website}`);
        } else {
          console.log(`   ✗ No website in tags for ${tags.name}`);
        }

        // Extract amenities from tags
        const osmAmenities: string[] = [];
        if (tags.wheelchair === "yes") osmAmenities.push("Wheelchair Accessible");
        if (tags["service:mental_health"])
          osmAmenities.push("Mental Health Support");
        if (tags["service:addiction"]) osmAmenities.push("Addiction Services");
        if (tags["service:domestic_violence"]) osmAmenities.push("DV Support");

        // Look up manually-curated enrichment data for this shelter.
        // If found, it fills in gaps that OSM doesn't cover (address, phone,
        // amenities, services, rules, eligibility, etc.).
        const enrichment = findShelterEnrichment(name, tags.operator);
        if (enrichment) {
          console.log(`   📋 Enrichment applied for: ${name}`);
        }

        // Merge OSM address fields with enrichment — OSM wins per-field if truthy
        const osmStreet = `${tags["addr:housenumber"] || ""} ${tags["addr:street"] || ""}`.trim();
        const mergedStreet = osmStreet || enrichment?.address?.street || "Address not available";
        const mergedCity = city !== "Los Angeles" ? city : (enrichment?.address?.city ?? city);
        const mergedState = tags["addr:state"] || enrichment?.address?.state || "State";
        const mergedZip = tags["addr:postcode"] || enrichment?.address?.zip || "00000";

        // OSM amenity flags win when present; enrichment fills when OSM found nothing
        const amenities = osmAmenities.length > 0 ? osmAmenities : (enrichment?.amenities ?? osmAmenities);

        // Fetch Wikipedia data using the OSM `wikipedia` tag (e.g. "en:Union Rescue Mission").
        // If OSM has no wikipedia tag, this returns null immediately without a network call.
        // Wikipedia fills in description and photo — the last resort after OSM and manual enrichment.
        const wiki = await fetchWikipediaEnrichment(tags.wikipedia);
        if (wiki) {
          console.log(`   📖 Wikipedia enriched: ${name}`);
        }

        return {
          id: `osm-${element.id}`,
          provider_id: `osm-${element.id}`,
          name,
          type,
          description: enrichment?.description ?? wiki?.description ?? description,
          coordinates: {
            latitude: shelterLat!,
            longitude: shelterLon!,
          },
          address: {
            street: mergedStreet,
            city: mergedCity,
            state: mergedState,
            zipCode: mergedZip,
          },
          distance:
            distance !== undefined ? Math.round(distance * 10) / 10 : undefined,
          price: {
            min: 0,
            max: 0,
            isFree: true, // Most shelters are free
            acceptsVouchers: false,
          },
          availability: "unknown", // OSM doesn't have real-time availability
          bedsAvailable: 0,
          totalBeds: enrichment?.capacity ?? parseInt(tags.capacity || tags.beds || "0"),
          amenities,
          services: enrichment?.services ?? [],
          rules: enrichment?.rules ?? [],
          eligibility: enrichment?.eligibility ?? [],
          requirements: [],
          features: {
            acceptsFamilies:
              tags["social_facility:for"]?.includes("family") || false,
            acceptsVeterans:
              tags["social_facility:for"]?.includes("veteran") || false,
            acceptsSingleMen:
              tags["social_facility:for"]?.includes("men") || true,
            acceptsSingleWomen:
              tags["social_facility:for"]?.includes("women") || true,
            petsAllowed: false,
            wheelchairAccessible: tags.wheelchair === "yes",
            lgbtqFriendly: false,
          },
          contact: {
            phone: phone ?? enrichment?.contact?.phone,
            email: email ?? enrichment?.contact?.email,
            website: websiteUrls ? websiteUrls.primary : website, // Use corrected URL for backward compatibility
            websiteUrls, // New field with primary and fallback URLs
            hours: tags.opening_hours || "Contact for hours",
          },
          rating: 0,
          reviewCount: 0,
          lastUpdated: new Date().toISOString(),
          provider: tags.operator || tags.name || "Community Resource",
          verified: false, // Not a Hou2ed partner
          source: "osm" as const,
          coverImage: enrichment?.photos?.[0] ?? wiki?.photo ?? coverImage,
          images: enrichment?.photos ?? (wiki?.photo ? [wiki.photo] : (coverImage ? [coverImage] : [])),
          externalMetadata: {
            placeId: `osm-${element.id}`,
            dataProvider: "OpenStreetMap",
            lastSynced: new Date().toISOString(),
            // Use the actual shelter website if available, otherwise no external URL
            externalUrl: website || "",
          },
        };
      }));
      allResults.push(...batchResults);
    }

    const shelters = allResults
      .filter((shelter: any): shelter is any => shelter !== null) // Remove null entries from broken URLs
      .sort((a: any, b: any) => a.distance - b.distance);

    console.log(
      `✅ Returning ${shelters.length} homeless shelters after filtering`,
    );

    // Log each shelter's name and website for debugging
    shelters.forEach((shelter: any, index: number) => {
      const actualUrl =
        shelter.contact.websiteUrls?.primary ||
        shelter.contact.website ||
        "NONE";
      console.log(`  ${index + 1}. ${shelter.name}: ${actualUrl}`);
    });

    // Website diversity analysis
    console.log("\n📊 Website Attribution Summary:");
    const websiteCounts = new Map<string, number>();
    const sheltersByWebsite = new Map<string, string[]>();

    shelters.forEach((shelter: any) => {
      const website = shelter.contact.website || "NO_WEBSITE";
      websiteCounts.set(website, (websiteCounts.get(website) || 0) + 1);

      if (!sheltersByWebsite.has(website)) {
        sheltersByWebsite.set(website, []);
      }
      sheltersByWebsite.get(website)?.push(shelter.name);
    });

    // Log website distribution
    websiteCounts.forEach((count, website) => {
      if (count > 1) {
        console.log(`⚠️  ${website}: ${count} shelters`);
        const shelterNames = sheltersByWebsite.get(website) || [];
        shelterNames.forEach((name) => {
          console.log(`      - ${name}`);
        });
      } else {
        console.log(`✅  ${website}: 1 shelter`);
      }
    });

    const uniqueWebsites = Array.from(websiteCounts.keys()).filter(
      (w) => w !== "NO_WEBSITE",
    );
    const sheltersWithWebsites = shelters.filter((s: any) => s.contact.website);
    console.log(`\n📈 Statistics:`);
    console.log(`   Total shelters: ${shelters.length}`);
    console.log(`   Shelters with websites: ${sheltersWithWebsites.length}`);
    console.log(`   Unique websites: ${uniqueWebsites.length}`);
    console.log(
      `   Website coverage: ${Math.round((sheltersWithWebsites.length / shelters.length) * 100)}%`,
    );

    return shelters;
  } catch (error) {
    console.error("Error fetching shelter data:", error);
    // Return empty array on error - app will fall back to mock data
    return [];
  }
}

// Calculate distance between two points in miles
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  // Validate inputs
  if (
    !lat1 ||
    !lon1 ||
    !lat2 ||
    !lon2 ||
    isNaN(lat1) ||
    isNaN(lon1) ||
    isNaN(lat2) ||
    isNaN(lon2)
  ) {
    console.warn(
      `⚠️ Invalid coordinates for distance calculation: (${lat1}, ${lon1}) to (${lat2}, ${lon2})`,
    );
    return NaN;
  }

  const R = 3959; // Radius of Earth in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  console.log(
    `   ✅ Distance calculated: ${distance.toFixed(2)} miles from (${lat1.toFixed(4)}, ${lon1.toFixed(4)}) to (${lat2.toFixed(4)}, ${lon2.toFixed(4)})`,
  );

  return distance;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Fallback: Search using Nominatim (also free)
export async function searchSheltersByName(
  query: string,
  latitude: number,
  longitude: number,
): Promise<any[]> {
  try {
    const searchQuery = `${query} homeless shelter social facility`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      searchQuery,
    )}&format=json&limit=20&bounded=1&viewbox=${longitude - 0.5},${latitude + 0.5},${longitude + 0.5},${latitude - 0.5}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "HOU2ED-App/1.0", // Required by Nominatim
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return data.map((place: any) => ({
      id: `nom-${place.place_id}`,
      name: place.display_name.split(",")[0],
      coordinates: {
        latitude: parseFloat(place.lat),
        longitude: parseFloat(place.lon),
      },
      type: "emergency_shelter",
      // ... transform other fields
    }));
  } catch (error) {
    console.error("Error searching shelters:", error);
    return [];
  }
}
