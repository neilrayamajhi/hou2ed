import { useQuery } from "@tanstack/react-query";
import { getProviderListings } from "../services/listing.service";
import { useAuthStore } from "../state/useAuthStore";

export function useProviderListings() {
  const providerId = useAuthStore((s) => s.user?.id || null);

  const query = useQuery({
    queryKey: ["providerListings", providerId],
    enabled: !!providerId,
    refetchOnMount: true, // Always refetch when component mounts with valid providerId
    queryFn: async () => {
      console.log(
        "[useProviderListings] Fetching listings for provider:",
        providerId,
      );
      if (!providerId) {
        console.warn(
          "[useProviderListings] No providerId - returning empty array",
        );
        return [];
      }
      const listings = await getProviderListings(providerId);
      console.log("[useProviderListings] Fetched", listings.length, "listings");
      return listings;
    },
  });

  console.log("[useProviderListings] Query state:", {
    providerId,
    enabled: !!providerId,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    dataCount: query.data?.length || 0,
  });

  return query;
}
