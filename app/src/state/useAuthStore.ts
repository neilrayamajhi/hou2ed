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

          // CRITICAL: Sign out from Supabase FIRST to clear session from client
          console.log("🔴 Signing out from Supabase...");
          await supabase.auth.signOut({ scope: "local" });
          console.log("✅ Supabase signOut complete");

          // Clear the zustand state immediately
          set({
            user: null,
            isAuthenticated: false,
            isReady: false,
            selectedRole: null,
            isLoading: false,
          });

          // Clear React Query cache completely
          queryClient.cancelQueries();
          await queryClient.invalidateQueries();
          await queryClient.resetQueries();
          await queryClient.clear();
          console.log("✅ React Query cache cleared");

          // Clear all auth-related storage
          await secureStorage.removeItem("auth-storage");

          console.log("✅ Logout complete");
        } catch (error) {
          console.error("Logout error:", error);
          // Even if signOut fails, clear everything
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
