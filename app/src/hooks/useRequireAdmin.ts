import { useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { useAuthStore } from "../state/useAuthStore";
import { useToast } from "../components/ui/Toast";

export function useRequireAdmin() {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { showToast } = useToast();

  useEffect(() => {
    // If not authenticated or wrong role, bounce to Tabs/RoleSelection
    if (user && user.role !== "admin") {
      showToast("Admin access only", "warning");
      try {
        navigation.navigate("Tabs");
      } catch {
        navigation.navigate("RoleSelection");
      }
    }
    if (!isAuthenticated) {
      try {
        navigation.navigate("RoleSelection");
      } catch {
        // no-op
      }
    }
  }, [user, isAuthenticated]);
}
