import { useState, useEffect } from 'react';
import { Platform } from 'react-native';

// Avoid importing expo-location on web; require lazily on native
let ExpoLocation: any = null;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ExpoLocation = require('expo-location');
}

interface LocationData {
  latitude: number;
  longitude: number;
}

interface UseLocationReturn {
  location: LocationData | null;
  loading: boolean;
  error: string | null;
  refreshLocation: () => Promise<void>;
}

export function useLocation(): UseLocationReturn {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getLocation = async () => {
    try {
      setLoading(true);
      setError(null);

      // Request permission
      if (!ExpoLocation) {
        // Web: Use fallback for web platform only (Los Angeles)
        console.log('📍 Web platform detected - using default location (Los Angeles)');
        setLocation({ latitude: 34.0522, longitude: -118.2437 });
        return;
      }

      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        console.warn('⚠️ Location permission denied - not setting fallback');
        setError('Permission to access location was denied');
        // Don't set a fallback location - let components handle the null case
        setLocation(null);
        setLoading(false);
        return;
      }

      // Get current position
      const currentLocation = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
      });

      console.log('✅ Got user location:', {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
    } catch (err) {
      console.error('Error getting location:', err);
      setError('Failed to get location');
      // Don't automatically set fallback - let the app handle null location
      setLocation(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Request location on all platforms
    getLocation();
  }, []);

  const refreshLocation = async () => {
    await getLocation();
  };

  return {
    location,
    loading,
    error,
    refreshLocation,
  };
}
