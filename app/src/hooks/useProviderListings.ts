import { useQuery } from "@tanstack/react-query";
import { getProviderListings } from "../services/listing.service";
import { useAuthStore } from "../state/useAuthStore";

export function useProviderListings() {
  const providerId = useAuthStore((s) => s.user?.id || null);

  const query = useQuery({
    queryKey: ["providerListings", providerId],
    enabled: !!providerId,
    queryFn: async () => {
      if (!providerId) return [];
      return getProviderListings(providerId);
    },
  });

  return query;
}

