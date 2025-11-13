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
  avatar_url?: string;
};

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isReady: boolean; // Indicates auth initialization is complete and safe to fetch data
  selectedRole: UserRole | null;
  setUser: (user: User | null) => void;
  setSelectedRole: (role: UserRole | null) => void;
  logout: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setReady: (ready: boolean) => void;
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
      isReady: false,
      selectedRole: null,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      setSelectedRole: (role) => set({ selectedRole: role }),

      setReady: (ready) => set({ isReady: ready }),

      logout: async () => {
        try {
          console.log("🔴 Logging out - clearing all data...");

          // Clear the zustand state immediately to prevent stale data access
          set({
            user: null,
            isAuthenticated: false,
            isReady: false,
            selectedRole: null,
          });

          // Clear React Query cache completely
          queryClient.cancelQueries(); // Cancel any in-flight queries
          await queryClient.invalidateQueries(); // Mark all as stale
          await queryClient.resetQueries(); // Reset to initial state
          await queryClient.clear(); // Clear all cache
          console.log("✅ React Query cache cleared");

          // Clear all auth-related storage
          await secureStorage.removeItem("auth-storage");

          // Sign out from Supabase last to ensure local state is cleared first
          await supabase.auth.signOut();

          // Force a small delay to ensure everything is cleared
          await new Promise((resolve) => setTimeout(resolve, 200));

          console.log("✅ Logout complete");
        } catch (error) {
          console.error("Logout error:", error);
          // Even if Supabase signOut fails, clear local state
          queryClient.cancelQueries();
          await queryClient.resetQueries();
          await queryClient.clear();
          set({
            user: null,
            isAuthenticated: false,
            isReady: false,
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
