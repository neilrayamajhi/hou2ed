import { useQuery } from "@tanstack/react-query";
import { getProviderApplications } from "../services/application.service";
import { useAuthStore } from "../state/useAuthStore";

export function useProviderApplications() {
  const providerId = useAuthStore((s) => s.user?.id || null);

  const query = useQuery({
    queryKey: ["providerApplications", providerId],
    enabled: !!providerId,
    queryFn: async () => {
      if (!providerId) return [];
      return getProviderApplications(providerId);
    },
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: true, // Refetch when tab becomes active
  });

  return query;
}
