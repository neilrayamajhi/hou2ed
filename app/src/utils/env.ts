import { z } from "zod";

// Environment variable schema - no hardcoded defaults for critical settings
const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  MAPS_PROVIDER: z.enum(["google", "apple"]).optional().default("google"),
  MAPS_IOS_API_KEY: z.string().optional(),
  MAPS_ANDROID_API_KEY: z.string().optional(),
  MAPBOX_TOKEN: z.string().optional(),
  SENTRY_DSN: z.string().url().optional(),
  POSTHOG_KEY: z.string().optional(),
});

// Parse and validate environment variables
const rawEnv = {
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  MAPS_PROVIDER: process.env.EXPO_PUBLIC_MAPS_PROVIDER as
    | "google"
    | "apple"
    | undefined,
  MAPS_IOS_API_KEY: process.env.EXPO_PUBLIC_MAPS_IOS_API_KEY,
  MAPS_ANDROID_API_KEY: process.env.EXPO_PUBLIC_MAPS_ANDROID_API_KEY,
  MAPBOX_TOKEN: process.env.EXPO_PUBLIC_MAPBOX_TOKEN,
  SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
  POSTHOG_KEY: process.env.EXPO_PUBLIC_POSTHOG_KEY,
};

// Fallback values for development if env vars are missing
const fallbackEnv = {
  // Use production Supabase if env vars are not loaded
  SUPABASE_URL: "https://rixiofltzptwaiwxhhlf.supabase.co",
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU",
};

// Validate and export
export const env = (() => {
  try {
    // Check if environment variables are loaded
    if (!rawEnv.SUPABASE_URL || !rawEnv.SUPABASE_ANON_KEY) {
      console.warn(
        "⚠️ Environment variables not loaded, using fallback configuration",
      );
      console.warn("⚠️ Make sure to restart Expo after creating .env file");

      // Use fallback values
      const envWithFallback = {
        ...rawEnv,
        SUPABASE_URL: rawEnv.SUPABASE_URL || fallbackEnv.SUPABASE_URL,
        SUPABASE_ANON_KEY:
          rawEnv.SUPABASE_ANON_KEY || fallbackEnv.SUPABASE_ANON_KEY,
      };

      const parsed = envSchema.parse(envWithFallback);

      if (__DEV__) {
        console.log("=== Environment Configuration (Fallback):");
        console.log("  Supabase URL:", parsed.SUPABASE_URL);
        console.log("  Using fallback config - restart Expo to load .env");
      }

      return parsed;
    }

    const parsed = envSchema.parse(rawEnv);

    // Log environment info in development
    if (__DEV__) {
      console.log("✅ Environment Configuration Loaded:");
      console.log("  Supabase URL:", parsed.SUPABASE_URL);
      console.log("  Maps Provider:", parsed.MAPS_PROVIDER);
      console.log(
        "  Mapbox:",
        parsed.MAPBOX_TOKEN ? "Configured" : "Not configured",
      );
      console.log(
        "  Sentry:",
        parsed.SENTRY_DSN ? "Configured" : "Not configured",
      );
      console.log(
        "  PostHog:",
        parsed.POSTHOG_KEY ? "Configured" : "Not configured",
      );
    }

    return parsed;
  } catch (error) {
    console.error("❌ Environment validation failed:", error);
    if (error instanceof z.ZodError) {
      console.error("Issues:", error.issues);
    }

    // Use fallback to prevent app crash
    const parsed = envSchema.parse(fallbackEnv);
    console.warn("Using fallback environment configuration");
    return parsed;
  }
})();

// Type-safe environment variables
export type Env = z.infer<typeof envSchema>;
