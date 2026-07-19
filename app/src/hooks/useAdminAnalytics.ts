import { useQuery } from "@tanstack/react-query";
import { getAdminAnalytics } from "../services/admin.service";
import { useAuthStore } from "../state/useAuthStore";

export function useAdminAnalytics() {
  const isAdmin = useAuthStore((s) => s.user?.role === "admin");

  return useQuery({
    queryKey: ["adminAnalytics"],
    enabled: isAdmin,
    refetchOnMount: true,
    queryFn: getAdminAnalytics,
  });
}
