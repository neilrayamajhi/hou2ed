/**
 * Geocoding service for converting addresses to coordinates
 * Uses OpenStreetMap Nominatim API (free, no API key required)
 * For production, consider Google Maps Geocoding API for better accuracy
 */

export interface GeocodeResult {
  success: boolean;
  latitude?: number;
  longitude?: number;
  formattedAddress?: string;
  error?: string;
}

/**
 * Geocode an address using OpenStreetMap Nominatim
 * Free and doesn't require API key
 */
export async function geocodeAddress(
  address: string,
  city?: string,
  state?: string,
  zipCode?: string
): Promise<GeocodeResult> {
  try {
    // Build full address string
    const parts = [address, city, state, zipCode].filter(Boolean);
    const fullAddress = parts.join(', ');

    if (!fullAddress.trim()) {
      return {
        success: false,
        error: 'Address is required',
      };
    }

    // Use Nominatim API (OpenStreetMap)
    const encodedAddress = encodeURIComponent(fullAddress);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'HOU2ED-App/1.0', // Nominatim requires a user agent
      },
    });

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      return {
        success: false,
        error: 'Address not found. Please check the address and try again.',
      };
    }

    const result = data[0];

    return {
      success: true,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      formattedAddress: result.display_name,
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to geocode address',
    };
  }
}

/**
 * Reverse geocode coordinates to get address
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<GeocodeResult> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'HOU2ED-App/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Reverse geocoding failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data || data.error) {
      return {
        success: false,
        error: 'Location not found',
      };
    }

    return {
      success: true,
      latitude,
      longitude,
      formattedAddress: data.display_name,
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reverse geocode',
    };
  }
}

/**
 * Calculate distance between two coordinates in miles
 * Uses Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
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

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
