import { useQuery } from "@tanstack/react-query";
import {
  getMarketplaceListings,
  type MarketplaceListing,
} from "../services/marketplace.service";
import { useLocation } from "./useLocation";
import { useFilterStore } from "../state/useFilterStore";
import { useAuthStore } from "../state/useAuthStore";

/**
 * Filter marketplace listings by quick filters
 */
function filterMarketplaceListings(
  listings: MarketplaceListing[],
  quickFilters: {
    immediate: boolean;
    free: boolean;
    veterans: boolean;
    families: boolean;
    nearMe: boolean;
  },
): MarketplaceListing[] {
  // Guard against undefined inputs
  if (!listings) return [];
  if (!quickFilters) return listings;

  // If no filters are active, return all listings
  const activeFilters = Object.values(quickFilters).some((v) => v);
  if (!activeFilters) {
    console.log("📝 No active filters, returning all listings");
    return listings;
  }

  return listings.filter((listing) => {
    // Immediate availability filter
    if (quickFilters.immediate && listing.availability !== "available") {
      return false;
    }

    // Free filter
    if (quickFilters.free && !listing.price?.isFree) {
      return false;
    }

    // Veterans filter
    if (quickFilters.veterans && !listing.features?.acceptsVeterans) {
      return false;
    }

    // Families filter
    if (quickFilters.families && !listing.features?.acceptsFamilies) {
      return false;
    }

    // Near me filter (within 2 miles)
    if (quickFilters.nearMe && listing.distance && listing.distance > 2) {
      return false;
    }

    return true;
  });
}

export function useMarketplaceListings() {
  const { location } = useLocation();
  const { quickFilters } = useFilterStore();
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const userRole = user?.role;

  return useQuery({
    queryKey: [
      "marketplaceListings",
      userId, // Include user ID to prevent cache sharing between users
      userRole, // Include role to ensure seekers and providers have separate caches
      location?.latitude,
      location?.longitude,
      quickFilters,
    ],
    queryFn: async () => {
      console.log("🏠 useMarketplaceListings - Fetching listings...");
      console.log(
        "   Location:",
        location
          ? `${location.latitude}, ${location.longitude}`
          : "Not available",
      );
      console.log("   Quick filters:", quickFilters);

      try {
        // Always try to fetch real listings from Supabase database
        const dbListings = await getMarketplaceListings(
          location?.latitude,
          location?.longitude,
          50, // 50 mile radius
        );

        console.log(
          `📍 Database query returned ${dbListings?.length || 0} listings`,
        );

        let allListings: MarketplaceListing[] = [];

        // Use real data if available
        if (dbListings && dbListings.length > 0) {
          console.log(
            `✅ Using ${dbListings.length} real listings from database`,
          );
          allListings = dbListings;
        } else {
          console.log("⚠️ No database listings found");
          // Return empty array if no real data
          allListings = [];
        }

        // Apply quick filters
        const filtered = filterMarketplaceListings(allListings, quickFilters);
        console.log(
          `🔍 Applied filters: ${allListings.length} → ${filtered.length} listings`,
        );

        return filtered;
      } catch (error) {
        console.error("❌ Error loading listings:", error);
        // Return empty array on error
        return [];
      }
    },
    staleTime: 10000, // Consider data stale after 10 seconds for faster updates
    gcTime: 2 * 60 * 1000, // Keep in cache for 2 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus to prevent constant reloading
    refetchOnMount: true, // Refetch when component mounts
    retry: 2, // Retry failed requests twice
  });
}
