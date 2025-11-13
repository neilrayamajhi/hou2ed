import { useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import { useAuthStore } from "../state/useAuthStore";

// Avoid importing expo-location on web; require lazily on native
let ExpoLocation: any = null;
if (Platform.OS !== "web") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ExpoLocation = require("expo-location");
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

  // Get auth state to re-fetch location when auth changes
  const isReady = useAuthStore((state) => state.isReady);
  const user = useAuthStore((state) => state.user);

  const getLocation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Request permission
      if (!ExpoLocation) {
        // Web: Use fallback for web platform only
        console.log("📍 Web platform detected - using default location");
        setLocation({ latitude: 37.7749, longitude: -122.4194 });
        return;
      }

      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        console.warn("⚠️ Location permission denied - not setting fallback");
        setError("Permission to access location was denied");
        // Don't set a fallback location - let components handle the null case
        setLocation(null);
        setLoading(false);
        return;
      }

      // Get current position
      const currentLocation = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
      });

      console.log("✅ Got user location:", {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
    } catch (err) {
      console.error("Error getting location:", err);
      setError("Failed to get location");
      // Don't automatically set fallback - let the app handle null location
      setLocation(null);
    } finally {
      setLoading(false);
    }
  }, []); // Empty deps - only state setters used inside

  useEffect(() => {
    // Request location when auth is ready
    // This ensures location is re-fetched after account switches
    if (isReady) {
      console.log(
        "🔄 Auth ready, fetching location for user:",
        user?.id || "unauthenticated",
        "role:",
        user?.role,
      );

      // Reset state before fetching
      setLocation(null);
      setError(null);

      // Only fetch location for seekers (providers don't need location for their dashboard)
      if (!user || user.role === "seeker") {
        // Fetch location immediately - no delay needed
        console.log("🔄 Starting location fetch for seeker");
        getLocation();
      } else {
        // For providers, set location as not loading
        console.log("🔄 User is provider, skipping location fetch");
        setLoading(false);
      }
    } else {
      // When auth is not ready (during logout), reset location state
      console.log("🔄 Auth not ready, resetting location state");
      setLocation(null);
      setLoading(true); // Reset to loading state
      setError(null);
    }
  }, [isReady, user?.id, user?.role]); // Re-fetch when auth state or role changes

  // Memoize refreshLocation to prevent unnecessary re-renders in components using this hook
  const refreshLocation = useCallback(async () => {
    await getLocation();
  }, []); // Empty deps - getLocation is defined in the component scope

  return {
    location,
    loading,
    error,
    refreshLocation,
  };
}
