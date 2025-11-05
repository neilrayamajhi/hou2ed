import { useQuery } from "@tanstack/react-query";
import { getMarketplaceListings } from "../services/marketplace.service";
import { useLocation } from "./useLocation";
import { useFilterStore } from "../state/useFilterStore";
import { filterListingsByQuick } from "../data/mockListings";
import { generateListingsAroundLocation, generateMockListings } from "../data/mockListings";

export function useMarketplaceListings() {
  const { location } = useLocation();
  const { quickFilters } = useFilterStore();

  return useQuery({
    queryKey: ["marketplaceListings", location?.latitude, location?.longitude, quickFilters],
    queryFn: async () => {
      try {
        // Fetch real listings from Supabase database
        const dbListings = await getMarketplaceListings(
          location?.latitude,
          location?.longitude,
          50 // 50 mile radius
        );

        let allListings;

        if (dbListings && dbListings.length > 0) {
          console.log(`📍 Found ${dbListings.length} real listings from database`);
          allListings = dbListings;
        } else {
          console.log("📍 No database listings, using mock data");
          // Fall back to mock data if no real listings
          allListings = location
            ? generateListingsAroundLocation(location.latitude, location.longitude, 20)
            : generateMockListings(20);
        }

        // Apply quick filters
        const filtered = filterListingsByQuick(allListings, quickFilters);
        console.log(`🔍 Filtered to ${filtered.length} listings based on quick filters`);

        return filtered;
      } catch (error) {
        console.error('Error loading listings:', error);
        // Fall back to mock data on error
        const mockData = location
          ? generateListingsAroundLocation(location.latitude, location.longitude, 20)
          : generateMockListings(20);
        return filterListingsByQuick(mockData, quickFilters);
      }
    },
    staleTime: 30000, // Consider data stale after 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus to prevent constant reloading
    refetchOnMount: true, // Refetch when component mounts
  });
}