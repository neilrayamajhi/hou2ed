import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

// Get environment variables
// For local development with Expo, use your machine's IP address
// You can find it with: ifconfig | grep "inet " | grep -v 127.0.0.1
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || "http://192.168.1.8:54321";
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

// Log which environment we're using (helpful for debugging)
console.log("Supabase URL:", supabaseUrl);
console.log("Running in:", __DEV__ ? "Development" : "Production");

// Custom storage adapter for Expo SecureStore
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error("SecureStore get error:", error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error("SecureStore set error:", error);
    }
  },
  removeItem: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error("SecureStore remove error:", error);
    }
  },
};

// Create Supabase client with custom storage
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database types (you can generate these from Supabase CLI)
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          email: string;
          full_name: string;
          username: string;
          role: "seeker" | "provider";
          is_verified: boolean;
          phone?: string;
          avatar_url?: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          username: string;
          role: "seeker" | "provider";
          is_verified?: boolean;
          phone?: string;
          avatar_url?: string;
        };
        Update: {
          email?: string;
          full_name?: string;
          username?: string;
          role?: "seeker" | "provider";
          is_verified?: boolean;
          phone?: string;
          avatar_url?: string;
          updated_at?: string;
        };
      };
      listings: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          provider_id: string;
          title: string;
          description: string;
          address: string;
          city: string;
          state: string;
          zip_code: string;
          beds_available: number;
          beds_total: number;
          housing_type: string;
          cost_per_month: number;
          is_active: boolean;
          amenities: string[];
          rules: string[];
          latitude?: number;
          longitude?: number;
        };
        Insert: {
          provider_id: string;
          title: string;
          description: string;
          address: string;
          city: string;
          state: string;
          zip_code: string;
          beds_available: number;
          beds_total: number;
          housing_type: string;
          cost_per_month: number;
          is_active?: boolean;
          amenities?: string[];
          rules?: string[];
          latitude?: number;
          longitude?: number;
        };
        Update: {
          title?: string;
          description?: string;
          address?: string;
          city?: string;
          state?: string;
          zip_code?: string;
          beds_available?: number;
          beds_total?: number;
          housing_type?: string;
          cost_per_month?: number;
          is_active?: boolean;
          amenities?: string[];
          rules?: string[];
          latitude?: number;
          longitude?: number;
          updated_at?: string;
        };
      };
      applications: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          seeker_id: string;
          listing_id: string;
          status:
            | "pending"
            | "reviewing"
            | "approved"
            | "rejected"
            | "waitlisted";
          notes?: string;
        };
        Insert: {
          seeker_id: string;
          listing_id: string;
          status?:
            | "pending"
            | "reviewing"
            | "approved"
            | "rejected"
            | "waitlisted";
          notes?: string;
        };
        Update: {
          status?:
            | "pending"
            | "reviewing"
            | "approved"
            | "rejected"
            | "waitlisted";
          notes?: string;
          updated_at?: string;
        };
      };
    };
  };
};

// Helper functions for common operations
export const authHelpers = {
  signUp: async (
    email: string,
    password: string,
    metadata: {
      full_name: string;
      username: string;
      role: "seeker" | "provider";
    },
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    return { data, error };
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
