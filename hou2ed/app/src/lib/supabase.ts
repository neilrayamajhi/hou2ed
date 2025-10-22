import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
// Avoid importing expo-secure-store on web; require lazily on native
let SecureStore: any = null;
if (Platform.OS !== "web") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  SecureStore = require("expo-secure-store");
}
import { env } from "../utils/env";
import type { Database } from "./supabase-types";

// Log which environment we're using (helpful for debugging)
if (__DEV__) {
  console.log("Supabase URL:", env.SUPABASE_URL);
  console.log("Running in:", "Development");
}

// Storage adapters: use SecureStore on native, localStorage on web
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    try {
      if (!SecureStore) return null;
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error("SecureStore get error:", error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      if (!SecureStore) return;
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error("SecureStore set error:", error);
    }
  },
  removeItem: async (key: string) => {
    try {
      if (!SecureStore) return;
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error("SecureStore remove error:", error);
    }
  },
};

const WebLocalStorageAdapter = {
  getItem: async (key: string) => {
    try {
      if (typeof window === "undefined") return null;
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(key, value);
    } catch {}
  },
  removeItem: async (key: string) => {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.removeItem(key);
    } catch {}
  },
};

// Create Supabase client with custom storage and type safety
export const supabase = createClient<Database>(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  {
    auth: {
      storage: Platform.OS === "web" ? (WebLocalStorageAdapter as any) : ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        // Add user agent for debugging
        'x-client-info': 'hou2ed-app',
      },
      // Set timeout to 30 seconds for all requests
      // This prevents hanging on slow networks
      fetch: (url, options = {}) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        return fetch(url, {
          ...options,
          signal: controller.signal,
        }).finally(() => {
          clearTimeout(timeoutId);
        });
      },
    },
  },
);

// Re-export types from supabase-types for convenience
export type {
  Database,
  Profile,
  Provider,
  Listing,
  Application,
  ApplicationDocument,
  MessageThread,
  Message,
  SavedListing,
  SavedSearch,
  SavedSearchAlert,
  AvailabilityHistory,
  PublicListing,
  SearchResult,
  AvailabilityResult,
} from "./supabase-types";

// Helper functions for common operations
export const authHelpers = {
  signUp: async (
    email: string,
    password: string,
    metadata: {
      full_name: string;
      username: string;
      role: "seeker" | "provider" | "admin";
    },
  ) => {
    // IMPORTANT: We use signInWithOtp to create the user AND send OTP code
    // This sends a 6-digit code instead of a magic link
    console.log("Creating user and sending OTP code to:", email);

    // First, send OTP to the email (this will create the user if they don't exist)
    const { data: otpData, error: otpError } =
      await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: true, // Create user if doesn't exist
          data: metadata, // User metadata
        },
      });

    if (otpError) {
      console.error("Failed to create user or send OTP:", otpError);
      return { data: null, error: otpError };
    }

    console.log("OTP code sent successfully!");
    console.log("User should receive a 6-digit code (not a link)");

    // Note: In a real app, you'd handle password setting differently
    // For now, we'll rely on the user logging in after verification

    return {
      data: {
        user: null, // User will be returned after OTP verification
        session: null,
      },
      error: null,
    };
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  resetPassword: async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "hou2ed://reset-password",
    });
    return { data, error };
  },

  updatePassword: async (newPassword: string) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { data, error };
  },

  getUser: async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    return { user, error };
  },

  getSession: async () => {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    return { session, error };
  },

  verifyOtp: async (email: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    return { data, error };
  },

  resendOtp: async (email: string) => {
    const { data, error } = await supabase.auth.resend({
      type: "signup",
      email,
    });
    return { data, error };
  },
};
