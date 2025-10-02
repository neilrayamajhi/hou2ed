import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';

export type UserRole = 'seeker' | 'provider';

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
  logout: () => void;
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
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      selectedRole: null,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      setSelectedRole: (role) =>
        set({ selectedRole: role }),

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          selectedRole: null,
        }),

      setLoading: (loading) =>
        set({ isLoading: loading }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);