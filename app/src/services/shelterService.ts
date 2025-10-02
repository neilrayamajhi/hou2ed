/**
 * Service for fetching real shelter data from OpenStreetMap
 * Uses Overpass API to query OSM data - completely free!
 */

interface OSMShelter {
  id: number;
  lat: number;
  lon: number;
  tags: {
    name?: string;
    amenity?: string;
    social_facility?: string;
    'social_facility:for'?: string;
    phone?: string;
    website?: string;
    'addr:street'?: string;
    'addr:housenumber'?: string;
    'addr:city'?: string;
    'addr:state'?: string;
    'addr:postcode'?: string;
    opening_hours?: string;
    capacity?: string;
    wheelchair?: string;
    operator?: string;
    description?: string;
  };
}

export async function fetchRealShelters(
  latitude: number,
  longitude: number,
  radiusKm: number = 10
): Promise<any[]> {
  try {
    // Overpass API query for homeless shelters and social facilities
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"="shelter"](around:${radiusKm * 1000},${latitude},${longitude});
        node["amenity"="social_facility"](around:${radiusKm * 1000},${latitude},${longitude});
        node["social_facility"="shelter"](around:${radiusKm * 1000},${latitude},${longitude});
        node["social_facility"="homeless_shelter"](around:${radiusKm * 1000},${latitude},${longitude});
        node["social_facility"="food_bank"](around:${radiusKm * 1000},${latitude},${longitude});
        way["amenity"="shelter"](around:${radiusKm * 1000},${latitude},${longitude});
        way["amenity"="social_facility"](around:${radiusKm * 1000},${latitude},${longitude});
        way["social_facility"="shelter"](around:${radiusKm * 1000},${latitude},${longitude});
        way["social_facility"="homeless_shelter"](around:${radiusKm * 1000},${latitude},${longitude});
      );
      out body;
      >;
      out skel qt;
    `.trim();

    // Use public Overpass API endpoint
    const url = 'https://overpass-api.de/api/interpreter';

    const response = await fetch(url, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Transform OSM data to our format
    const shelters = data.elements
      .filter((element: any) => element.tags?.name) // Only include named places
      .map((element: OSMShelter) => {
        const tags = element.tags;

        // Calculate distance from user
        const distance = calculateDistance(
          latitude,
          longitude,
          element.lat,
          element.lon
        );

        // Determine type based on tags
        let type = 'emergency_shelter';
        if (tags.social_facility === 'food_bank') {
          type = 'food_bank';
        } else if (tags['social_facility:for']?.includes('veteran')) {
          type = 'veterans_housing';
        } else if (tags['social_facility:for']?.includes('youth')) {
          type = 'youth_housing';
        } else if (tags['social_facility:for']?.includes('women')) {
          type = 'domestic_violence_shelter';
        }

        return {
          id: `osm-${element.id}`,
          name: tags.name || 'Unnamed Shelter',
          type,
          description: tags.description || `${tags.social_facility || tags.amenity || 'Shelter'} facility`,
          coordinates: {
            latitude: element.lat,
            longitude: element.lon,
          },
          address: {
            street: `${tags['addr:housenumber'] || ''} ${tags['addr:street'] || 'Address not available'}`.trim(),
            city: tags['addr:city'] || 'Unknown City',
            state: tags['addr:state'] || 'State',
            zipCode: tags['addr:postcode'] || '00000',
          },
          distance: Math.round(distance * 10) / 10,
          price: {
            min: 0,
            max: 0,
            isFree: true, // Most shelters are free
            acceptsVouchers: false,
          },
          availability: 'unknown', // OSM doesn't have real-time availability
          bedsAvailable: 0,
          totalBeds: parseInt(tags.capacity || '0'),
          amenities: [],
          requirements: [],
          features: {
            acceptsFamilies: false,
            acceptsVeterans: tags['social_facility:for']?.includes('veteran') || false,
            acceptsSingleMen: true,
            acceptsSingleWomen: true,
            petsAllowed: false,
            wheelchairAccessible: tags.wheelchair === 'yes',
            lgbtqFriendly: false,
          },
          contact: {
            phone: tags.phone || 'Not available',
            email: undefined,
            hours: tags.opening_hours || '24/7',
          },
          provider: tags.operator || 'Local Organization',
          verified: true, // OSM data is community verified
          website: tags.website,
        };
      })
      .sort((a: any, b: any) => a.distance - b.distance);

    return shelters;
  } catch (error) {
    console.error('Error fetching shelter data:', error);
    // Return empty array on error - app will fall back to mock data
    return [];
  }
}

// Calculate distance between two points in miles
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
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
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Fallback: Search using Nominatim (also free)
export async function searchSheltersByName(
  query: string,
  latitude: number,
  longitude: number
): Promise<any[]> {
  try {
    const searchQuery = `${query} homeless shelter social facility`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      searchQuery
    )}&format=json&limit=20&bounded=1&viewbox=${longitude - 0.5},${latitude + 0.5},${longitude + 0.5},${latitude - 0.5}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'HOU2ED-App/1.0', // Required by Nominatim
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return data.map((place: any) => ({
      id: `nom-${place.place_id}`,
      name: place.display_name.split(',')[0],
      coordinates: {
        latitude: parseFloat(place.lat),
        longitude: parseFloat(place.lon),
      },
      type: 'emergency_shelter',
      // ... transform other fields
    }));
  } catch (error) {
    console.error('Error searching shelters:', error);
    return [];
  }
}