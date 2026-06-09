import { useQuery } from "@tanstack/react-query";
import { getAdminStats } from "../services/admin.service";
import { useAuthStore } from "../state/useAuthStore";

export function useAdminStats() {
  const isAdmin = useAuthStore((s) => s.user?.role === "admin");

  return useQuery({
    queryKey: ["adminStats"],
    enabled: isAdmin,
    refetchOnMount: true,
    queryFn: getAdminStats,
  });
}
