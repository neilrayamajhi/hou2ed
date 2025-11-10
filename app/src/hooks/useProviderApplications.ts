import { useQuery } from "@tanstack/react-query";
import { getProviderApplications } from "../services/application.service";
import { useAuthStore } from "../state/useAuthStore";

export function useProviderApplications() {
  const user = useAuthStore((s) => s.user);
  const providerId = user?.id || null;
  const userRole = user?.role;

  const query = useQuery({
    // Include role to ensure proper cache separation
    queryKey: ["providerApplications", providerId, userRole],
    enabled: !!providerId && userRole === "provider",
    queryFn: async () => {
      if (!providerId || userRole !== "provider") {
        console.log("⚠️ Not fetching applications - not a provider");
        return [];
      }

      console.log("📋 Fetching applications for provider:", providerId);
      const applications = await getProviderApplications(providerId);
      console.log(`✅ Fetched ${applications.length} applications`);
      return applications;
    },
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: true, // Refetch when tab becomes active
  });

  return query;
}
