/**
 * Geocoding Service - Convert addresses to coordinates
 * Using Mapbox Geocoding API (100k free requests/month)
 */

const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '';
const MAPBOX_GEOCODING_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

export interface GeocodingResult {
  success: boolean;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  formattedAddress?: string;
  error?: string;
}

/**
 * Geocode an address to get latitude/longitude coordinates
 * @param address - Full address string (e.g., "123 Main St, Los Angeles, CA 90012")
 * @returns Coordinates and formatted address
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult> {
  try {
    if (!address || address.trim().length === 0) {
      return {
        success: false,
        error: 'Address is required',
      };
    }

    if (!MAPBOX_ACCESS_TOKEN) {
      console.warn('⚠️ MAPBOX_TOKEN not configured, using fallback coordinates');
      // Fallback to default LA coordinates if no API key
      return {
        success: true,
        coordinates: {
          latitude: 34.0522,
          longitude: -118.2437,
        },
        formattedAddress: address,
      };
    }

    // Encode address for URL
    const encodedAddress = encodeURIComponent(address);

    // Build Mapbox geocoding URL
    // Bias results towards Los Angeles area and limit to US
    const url = `${MAPBOX_GEOCODING_URL}/${encodedAddress}.json?access_token=${MAPBOX_ACCESS_TOKEN}&country=US&proximity=-118.2437,34.0522&limit=1`;

    console.log('🌍 Geocoding address:', address);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const data = await response.json();

    // Check if we got results
    if (!data.features || data.features.length === 0) {
      return {
        success: false,
        error: 'Address not found. Please check the address and try again.',
      };
    }

    // Extract coordinates from first result
    const feature = data.features[0];
    const [longitude, latitude] = feature.center;

    console.log('✅ Geocoded successfully:', { latitude, longitude });

    return {
      success: true,
      coordinates: {
        latitude,
        longitude,
      },
      formattedAddress: feature.place_name || address,
    };
  } catch (error) {
    console.error('❌ Geocoding error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to geocode address',
    };
  }
}

/**
 * Reverse geocode coordinates to get an address
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @returns Formatted address
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<{ success: boolean; address?: string; error?: string }> {
  try {
    if (!MAPBOX_ACCESS_TOKEN) {
      return {
        success: false,
        error: 'Mapbox API token not configured',
      };
    }

    const url = `${MAPBOX_GEOCODING_URL}/${longitude},${latitude}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`;

    console.log('🌍 Reverse geocoding:', { latitude, longitude });

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Reverse geocoding API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      return {
        success: false,
        error: 'Location not found',
      };
    }

    const address = data.features[0].place_name;

    console.log('✅ Reverse geocoded successfully:', address);

    return {
      success: true,
      address,
    };
  } catch (error) {
    console.error('❌ Reverse geocoding error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reverse geocode',
    };
  }
}

/**
 * Validate that coordinates are within reasonable bounds
 */
export function validateCoordinates(
  latitude: number,
  longitude: number,
): boolean {
  return (
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in miles
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 3959; // Radius of Earth in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10; // Round to 1 decimal
}
