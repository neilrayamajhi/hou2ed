import { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

/**
 * Transform Supabase user to app user format
 * Eliminates code duplication across auth components
 */
export const transformUserData = async (user: User) => {
  console.log("Transforming user data. Raw metadata:", user.user_metadata);

  // Fetch profile data including avatar_url and role.
  // The profiles table is the source of truth for role (RLS policies check
  // profiles.role), so we read it from there rather than auth user_metadata.
  let avatar_url: string | undefined;
  let role: "seeker" | "provider" | "admin" =
    (user.user_metadata?.role as "seeker" | "provider" | "admin") || "seeker";
  try {
    console.log("[transformUserData] Fetching profile for user:", user.id);
    const { data: profile, error } = await Promise.race([
      supabase
        .from("profiles")
        .select("avatar_url, role")
        .eq("id", user.id)
        .maybeSingle(),
      // Add a timeout to prevent hanging
      new Promise<{ data: null; error: Error }>((resolve) =>
        setTimeout(
          () => resolve({ data: null, error: new Error("Timeout") }),
          5000,
        ),
      ),
    ]);

    if (error) {
      console.warn(
        "[transformUserData] Failed to fetch profile:",
        error.message,
      );
    } else {
      avatar_url = profile?.avatar_url || undefined;
      role = (profile?.role as "seeker" | "provider" | "admin") || role;
      console.log("[transformUserData] Fetched profile:", { avatar_url, role });
    }
  } catch (error) {
    console.warn("[transformUserData] Error fetching profile:", error);
    // Don't fail the entire login process if profile fetch fails
  }

  const transformed = {
    id: user.id,
    email: user.email || "",
    fullName: user.user_metadata?.full_name || "",
    username: user.user_metadata?.username || "",
    role,
    isVerified: user.email_confirmed_at !== null,
    createdAt: user.created_at || new Date().toISOString(),
    avatar_url,
  };
  console.log("Transformed user data:", transformed);
  return transformed;
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Extract email from email or username input
 */
export const extractEmailFromInput = (input: string): string | null => {
  if (isValidEmail(input)) {
    return input;
  }
  // For username, return null (will need to lookup email from username)
  return null;
};

/**
 * Retry async function with exponential backoff
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries = 2, // Reduced from 3 to 2
  initialDelay = 500, // Reduced from 1000ms to 500ms
): Promise<T> => {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`Attempt ${i + 1} of ${maxRetries}...`);
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.log(`Attempt ${i + 1} failed:`, lastError.message);

      // Don't retry on auth errors (wrong password, etc) or network errors
      if (
        lastError.message?.includes("Invalid login credentials") ||
        lastError.message?.includes("Email not confirmed") ||
        lastError.message?.includes("User already registered") ||
        lastError.message?.includes("Email already registered") ||
        lastError.message?.includes("Username already taken") ||
        lastError.message?.includes("Invalid Refresh Token") ||
        lastError.message?.includes("Refresh Token Not Found") ||
        lastError.message?.includes("fetch") ||
        lastError.message?.includes("Network request failed") ||
        lastError.message?.includes("aborted")
      ) {
        throw lastError;
      }

      // Shorter exponential backoff
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(1.5, i); // Less aggressive backoff (1.5x instead of 2x)
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
};
