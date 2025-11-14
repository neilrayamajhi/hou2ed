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
  console.log("=== Supabase Configuration ===");
  console.log("Supabase URL:", env.SUPABASE_URL);
  console.log("Running in:", "Development");
  console.log("==============================");
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

// Create a fetch wrapper with timeout to prevent hanging
const fetchWithTimeout = async (
  url: RequestInfo | URL,
  options: RequestInit = {},
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      console.warn("⚠️ Fetch timeout after 15 seconds:", url);
      throw new Error("Request timeout");
    }
    throw error;
  }
};

// Factory function to create Supabase client
function createSupabaseClient() {
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      storage:
        Platform.OS === "web"
          ? (WebLocalStorageAdapter as any)
          : ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        // Add user agent for debugging
        "x-client-info": "hou2ed-app",
      },
      fetch: fetchWithTimeout as any, // Use custom fetch with timeout
    },
  });
}

// Create initial Supabase client - will be recreated on logout
let supabaseInstance = createSupabaseClient();

// Export getter to always get current instance
export const getSupabase = () => supabaseInstance;

// For backward compatibility, export as 'supabase'
export const supabase = new Proxy(
  {} as ReturnType<typeof createSupabaseClient>,
  {
    get: (target, prop) => {
      return (supabaseInstance as any)[prop];
    },
  },
);

// Recreate the client to clear ALL internal state (including cached sessions)
export async function resetSupabaseClient() {
  console.log("🔄 Recreating Supabase client to clear all internal state...");

  // Create a completely new client instance
  supabaseInstance = createSupabaseClient();

  console.log("✅ Supabase client recreated with clean state");
}

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
    console.log(
      "Creating user with password and sending verification email to:",
      email,
    );
    console.log("User metadata being sent:", metadata);
    console.log("Password length:", password.length, "characters");

    // Validate password before sending to Supabase
    if (!password || password.length < 8) {
      console.error(
        "Password validation failed: Must be at least 8 characters",
      );
      return {
        data: null,
        error: new Error("Password must be at least 8 characters long"),
      };
    }

    // Use auth.signUp which saves the password AND sends verification email
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: metadata, // User metadata
        emailRedirectTo: undefined, // No redirect, we use OTP codes
      },
    });

    // IMPORTANT: Supabase has a quirk where if an unconfirmed user already exists,
    // it returns success but with identities = [] (empty array)
    // This is how we detect duplicate email signups
    if (
      data?.user &&
      (!data.user.identities || data.user.identities.length === 0)
    ) {
      console.warn(
        "⚠️ Duplicate email detected - user returned with no identities",
      );
      console.warn("   Email:", email);
      console.warn("   User ID returned:", data.user.id);
      console.warn("   This email is already registered in the system");
      return {
        data: null,
        error: new Error(
          "This email is already registered. Please use a different email or try logging in.",
        ),
      };
    }

    if (error) {
      console.error("Failed to create user:", error);
      console.error("Error details:", {
        message: error.message,
        status: (error as any).status,
        code: (error as any).code,
      });

      // Check for specific error types
      if (error.message?.includes("weak_password")) {
        console.error(
          "Password is too weak. Supabase requires stronger passwords.",
        );
      } else if (error.message?.includes("already_exists")) {
        console.error("User already exists with this email.");
      }

      return { data: null, error };
    }

    // Verify the user was created with proper fields
    if (data?.user) {
      console.log("✅ User created successfully!");
      console.log("   User ID:", data.user.id);
      console.log("   Email:", data.user.email);
      console.log("   Metadata saved:", data.user.user_metadata);
      console.log(
        "   Email confirmed:",
        data.user.email_confirmed_at ? "Yes" : "Needs verification",
      );

      // Important: Log session status
      if (data.session) {
        console.log("   Session created:", "Yes (user can login immediately)");
      } else {
        console.log(
          "   Session created:",
          "No (email verification required first)",
        );
      }

      console.log("\n📧 Email verification sent with 6-digit OTP code");
      console.log("   User should check inbox (and spam folder)");
    } else {
      console.warn(
        "⚠️ User data not returned properly - signup may have failed",
      );
    }

    return {
      data: data,
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
    try {
      console.log("🚪 Starting signOut process...");

      // Step 1: Clear storage FIRST (before calling signOut to avoid hanging)
      console.log("🧹 Clearing storage first...");
      if (Platform.OS === "web") {
        await WebLocalStorageAdapter.removeItem("supabase.auth.token");
        // Clear all Supabase keys from localStorage
        if (typeof window !== "undefined") {
          const keysToRemove: string[] = [];
          for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            if (key && key.startsWith("sb-")) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach((key) => window.localStorage.removeItem(key));
          console.log(`🧹 Cleared ${keysToRemove.length} localStorage keys`);
        }
      } else {
        await ExpoSecureStoreAdapter.removeItem("supabase.auth.token");
        // Clear other potential Supabase keys
        try {
          await ExpoSecureStoreAdapter.removeItem("sb-access-token");
          await ExpoSecureStoreAdapter.removeItem("sb-refresh-token");
        } catch (e) {
          // Ignore errors for keys that might not exist
        }
      }

      // Step 2: RECREATE the client to clear ALL internal state
      // This is the CRITICAL FIX - don't try to fix the broken client, replace it
      await resetSupabaseClient();

      console.log("✅ SignOut complete - storage cleared and client recreated");
      return { error: null };
    } catch (error) {
      console.error("Error during signOut:", error);
      // Even on error, recreate the client
      try {
        await resetSupabaseClient();
      } catch (e) {
        console.error("Failed to reset client on error:", e);
      }
      return { error: error as any };
    }
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
