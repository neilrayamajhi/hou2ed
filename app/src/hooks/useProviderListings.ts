import { useQuery } from "@tanstack/react-query";
import { getProviderListings } from "../services/listing.service";
import { useAuthStore } from "../state/useAuthStore";
import { useEffect, useState } from "react";
import { queryClient } from "../providers/QueryProvider";
import { supabase } from "../lib/supabase";

export function useProviderListings() {
  const user = useAuthStore((s) => s.user);
  const isReady = useAuthStore((s) => s.isReady);
  const providerId = user?.id || null;
  const userRole = user?.role;
  const [sessionReady, setSessionReady] = useState(false);

  // Track session readiness - re-establish listener when user changes
  useEffect(() => {
    let authListener: { subscription: { unsubscribe: () => void } } | null =
      null;

    const initSession = async () => {
      // Check if session is ready
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const isReady = !!session && session.user?.id === providerId;
      setSessionReady(isReady);

      if (isReady) {
        console.log("✅ Session ready for provider:", providerId);
      }
    };

    // Only set up listener if we have a provider
    if (providerId && userRole === "provider") {
      initSession();

      // Listen for auth state changes
      const { data: listener } = supabase.auth.onAuthStateChange(
        (event, session) => {
          console.log("🔐 Auth state changed in useProviderListings:", event);

          const isReady = !!session && session.user?.id === providerId;
          setSessionReady(isReady);

          // Invalidate queries on relevant auth events
          if (
            event === "SIGNED_IN" ||
            event === "TOKEN_REFRESHED" ||
            event === "USER_UPDATED"
          ) {
            // Use the new query key format with user ID and role
            queryClient.invalidateQueries({
              queryKey: ["providerListings", providerId, "provider"],
            });
          }
        },
      );

      authListener = listener;
    } else {
      setSessionReady(false);
    }

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [providerId, userRole]); // CRITICAL: Add dependencies so listener re-establishes when user changes

  // Clear stale data when user changes
  useEffect(() => {
    if (!providerId || userRole !== "provider") {
      // Clear provider listings cache if not a provider
      queryClient.invalidateQueries({ queryKey: ["providerListings"] });
      queryClient.removeQueries({ queryKey: ["providerListings"] });
    }
  }, [providerId, userRole]);

  const query = useQuery({
    // Include user ID and role in query key to ensure cache separation between users
    queryKey: ["providerListings", providerId, userRole],
    enabled: !!providerId && userRole === "provider" && sessionReady && isReady,
    queryFn: async () => {
      if (!providerId || userRole !== "provider") {
        console.log("⚠️ Skipping fetch - not a provider");
        return [];
      }

      console.log("🔄 Fetching listings for provider:", providerId);

      try {
        const listings = await getProviderListings(providerId);
        console.log("✅ Successfully fetched", listings.length, "listings");
        return listings;
      } catch (error) {
        console.error("❌ Failed to fetch listings:", error);
        throw error;
      }
    },
    // Allow normal caching now that we have proper cache invalidation
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    // Retry with exponential backoff
    retry: (failureCount, error: any) => {
      if (error?.message?.includes("Session user mismatch")) {
        // Don't retry on session mismatch, wait for correct session
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  return query;
}
