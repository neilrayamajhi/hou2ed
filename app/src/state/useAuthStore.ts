import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";
import { supabase } from "../lib/supabase";
import { queryClient } from "../providers/QueryProvider";

export type UserRole = "seeker" | "provider";

export type User = {
  id: string;
  email: string;
  fullName: string;
  username: string;
  role: UserRole;
  isVerified: boolean;
  createdAt: string;
};

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  selectedRole: UserRole | null;
  setUser: (user: User | null) => void;
  setSelectedRole: (role: UserRole | null) => void;
  logout: () => Promise<void>;
  setLoading: (loading: boolean) => void;
};

const secureStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(name);
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await SecureStore.deleteItemAsync(name);
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      selectedRole: null,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      setSelectedRole: (role) => set({ selectedRole: role }),

      logout: async () => {
        try {
          console.log("🔴 Logging out - clearing all data...");

          // Sign out from Supabase first
          await supabase.auth.signOut();

          // Clear React Query cache (this fixes the stale data issue!)
          queryClient.clear();
          console.log("✅ React Query cache cleared");

          // Clear all auth-related storage
          await secureStorage.removeItem("auth-storage");

          // Clear the zustand state
          set({
            user: null,
            isAuthenticated: false,
            selectedRole: null,
          });

          console.log("✅ Logout complete");
        } catch (error) {
          console.error("Logout error:", error);
          // Even if Supabase signOut fails, clear local state
          queryClient.clear();
          set({
            user: null,
            isAuthenticated: false,
            selectedRole: null,
          });
        }
      },

      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
