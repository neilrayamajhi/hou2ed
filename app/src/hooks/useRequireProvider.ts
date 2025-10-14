import { useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { useAuthStore } from "../state/useAuthStore";
import { useToast } from "../components/ui/Toast";

export function useRequireProvider() {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { showToast } = useToast();

  useEffect(() => {
    // If not authenticated or wrong role, bounce to Tabs/RoleSelection
    if (user && user.role !== "provider") {
      showToast("Provider access only", "warning");
      // Try Tabs first; if not mounted, go to RoleSelection
      try {
        navigation.navigate("Tabs");
      } catch {
        navigation.navigate("RoleSelection");
      }
    }
    if (!isAuthenticated) {
      // If logged out, send to login/role selection
      try {
        navigation.navigate("RoleSelection");
      } catch {
        // no-op
      }
    }
  }, [user, isAuthenticated]);
}

