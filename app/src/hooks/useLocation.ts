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
        // Web: skip real permissions, use fallback immediately
        setLocation({ latitude: 37.7749, longitude: -122.4194 });
        return;
      }

      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setError('Permission to access location was denied');
        setLoading(false);
        return;
      }

      // Get current position
      const currentLocation = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
      });

      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
    } catch (err) {
      console.error('Error getting location:', err);
      setError('Failed to get location');

      // Set default location (San Francisco) as fallback
      setLocation({
        latitude: 37.7749,
        longitude: -122.4194,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only request location on mobile platforms
    if (Platform.OS !== 'web') {
      getLocation();
    } else {
      // Set default for web
      setLocation({
        latitude: 37.7749,
        longitude: -122.4194,
      });
      setLoading(false);
    }
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
