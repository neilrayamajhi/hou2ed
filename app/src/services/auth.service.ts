import { supabase, authHelpers } from "../lib/supabase";
import { validateEmail } from "../utils/validation";
import { transformUserData, retryWithBackoff } from "../utils/auth";
import { AuthError, AUTH_ERROR_CODES } from "../utils/auth-errors";
import { env } from "../utils/env";
import { queryClient } from "../providers/QueryProvider";

export interface LoginCredentials {
  emailOrUsername: string;
  password: string;
}

export interface LoginResult {
  success: boolean;
  user?: any;
  error?: string;
  errorCode?: string;
}

/**
 * Resolves an email address from a username by looking up in profiles
 */
async function resolveEmailFromUsername(
  username: string,
): Promise<string | null> {
  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("email")
      .eq("username", username)
      .maybeSingle(); // Use maybeSingle to handle no results gracefully

    if (error) {
      // Only log actual errors, not "no rows" results
      if (!error.message?.includes("No rows")) {
        console.error("Error resolving username:", error);
      }
      return null;
    }

    if (!profile) {
      // Username doesn't exist
      return null;
    }

    return profile?.email || null;
  } catch (error) {
    console.error("Unexpected error resolving username:", error);
    return null;
  }
}

/**
 * Determines if the input is an email or username and returns the email
 */
export async function resolveEmail(
  emailOrUsername: string,
): Promise<string | null> {
  // If it's already an email, return it
  if (validateEmail(emailOrUsername)) {
    return emailOrUsername;
  }

  // Otherwise, try to resolve it as a username
  return resolveEmailFromUsername(emailOrUsername);
}

/**
 * Performs the authentication WITHOUT retry logic (was causing timeouts)
 */
async function performAuthentication(email: string, password: string) {
  // Don't clear session before login - this causes auth state issues
  // The new login will replace any existing session automatically
  return authHelpers.signIn(email, password);
}

/**
 * Main login function with all business logic extracted
 */
export async function loginUser(
  credentials: LoginCredentials,
): Promise<LoginResult> {
  const { emailOrUsername, password } = credentials;

  // Validate inputs
  if (!emailOrUsername?.trim() || !password?.trim()) {
    return {
      success: false,
      error: "Email/username and password are required",
      errorCode: "VALIDATION_ERROR",
    };
  }

  try {
    console.log("Login attempt for:", emailOrUsername);

    // Resolve email from username if needed
    const email = await resolveEmail(emailOrUsername);

    if (!email) {
      console.log("Could not resolve email for:", emailOrUsername);
      return {
        success: false,
        error: "Username not found",
        errorCode: AUTH_ERROR_CODES.USER_NOT_FOUND,
      };
    }

    console.log("Attempting authentication with email:", email);

    // Perform authentication
    const { data, error } = await performAuthentication(email, password);

    if (error) {
      console.error("Authentication error:", error);
      console.error("Error details:", {
        message: error.message,
        status: (error as any).status,
        code: (error as any).code,
      });

      // Provide more detailed error information
      if (error.message?.includes("Invalid login credentials")) {
        console.log("Authentication failed - possible causes:");
        console.log("1. Incorrect password");
        console.log("2. User doesn't exist in auth.users table");
        console.log("3. Email not verified (if verification is required)");
        console.log("4. Account may need password reset");
      }

      throw error;
    }

    if (data?.user) {
      console.log("Login successful for user:", data.user.id);
      const userData = transformUserData(data.user);

      // Clear ALL React Query cache to ensure fresh data for the new user
      console.log("🔄 Clearing all React Query cache after login");
      await queryClient.resetQueries(); // Use resetQueries instead of invalidateQueries
      await queryClient.clear(); // Also clear the cache completely

      // Force a small delay to ensure cache is cleared
      await new Promise((resolve) => setTimeout(resolve, 100));

      return {
        success: true,
        user: userData,
      };
    }

    console.log("Login failed - no user data returned");
    return {
      success: false,
      error: "Login failed",
      errorCode: AUTH_ERROR_CODES.UNKNOWN,
    };
  } catch (error: any) {
    console.error("Login error details:", error);

    // Check for network/connection errors
    if (
      error?.message?.includes("fetch") ||
      error?.message?.includes("NetworkError") ||
      error?.message?.includes("Failed to fetch") ||
      error?.message?.includes("Network request failed")
    ) {
      return {
        success: false,
        error:
          "Unable to connect to server. Please check your internet connection.",
        errorCode: "NETWORK_ERROR",
      };
    }

    const authError = error as AuthError;
    return {
      success: false,
      error: authError.message || "An error occurred during login",
      errorCode: authError.code || AUTH_ERROR_CODES.UNKNOWN,
    };
  }
}

/**
 * Request password reset for an email
 */
export async function requestPasswordReset(
  email: string,
): Promise<LoginResult> {
  if (!validateEmail(email)) {
    return {
      success: false,
      error: "Invalid email address",
      errorCode: "VALIDATION_ERROR",
    };
  }

  try {
    const { error } = await authHelpers.resetPassword(email);

    if (error) {
      throw error;
    }

    return {
      success: true,
    };
  } catch (error) {
    const authError = error as AuthError;
    return {
      success: false,
      error: authError.message || "Failed to send reset email",
      errorCode: authError.code || AUTH_ERROR_CODES.UNKNOWN,
    };
  }
}

/**
 * Verify OTP code
 */
export async function verifyOtp(
  email: string,
  code: string,
): Promise<LoginResult> {
  try {
    console.log("Verifying OTP for:", email);
    console.log("Code entered:", code);

    // Use the correct OTP verification method
    const { data, error } = await supabase.auth.verifyOtp({
      email: email,
      token: code,
      type: "email",
    });

    if (error) {
      console.error("OTP Verification Error:", error);

      // Check if it's a format error (code vs link)
      if (
        error.message?.includes("token") ||
        error.message?.includes("invalid")
      ) {
        console.log(
          "Tip: Make sure you're entering the 6-digit code from your email",
        );
        console.log(
          "If you received a link, the code is in the URL after 'token='",
        );
      }

      throw error;
    }

    if (data?.user) {
      console.log("Verification successful for:", email);
      const userData = transformUserData(data.user);
      return {
        success: true,
        user: userData,
      };
    }

    if (data?.session) {
      console.log("Session created, fetching user data");
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const userData = transformUserData(user);
        return {
          success: true,
          user: userData,
        };
      }
    }

    return {
      success: false,
      error: "Verification failed - no user data returned",
      errorCode: AUTH_ERROR_CODES.UNKNOWN,
    };
  } catch (error) {
    const authError = error as AuthError;

    console.log("================================");
    console.log("Email Verification Failed");
    console.log("Error:", authError.message);
    console.log("Check your email for the 6-digit code");
    console.log("If you see a link, extract the code from the URL");
    console.log("================================");

    return {
      success: false,
      error: authError.message || "Invalid verification code",
      errorCode: authError.code || AUTH_ERROR_CODES.UNKNOWN,
    };
  }
}

export interface SignUpCredentials {
  fullName: string;
  username: string;
  email: string;
  password: string;
  role: "seeker" | "provider";
}

export interface SignUpResult {
  success: boolean;
  user?: any;
  error?: string;
  errorCode?: string;
}

/**
 * Sign up a new user with validation and error handling
 */
export async function signUpUser(
  credentials: SignUpCredentials,
): Promise<SignUpResult> {
  const { fullName, username, email, password, role } = credentials;

  // Validate inputs
  if (
    !email?.trim() ||
    !password?.trim() ||
    !username?.trim() ||
    !fullName?.trim()
  ) {
    return {
      success: false,
      error: "All fields are required",
      errorCode: "VALIDATION_ERROR",
    };
  }

  if (!validateEmail(email)) {
    return {
      success: false,
      error: "Invalid email address",
      errorCode: "VALIDATION_ERROR",
    };
  }

  try {
    // Log the API endpoint being used (helpful for debugging)
    console.log(
      "Attempting sign up to:",
      (supabase as any).supabaseUrl || "Unknown URL",
    );

    // CRITICAL: Check if email is already registered FIRST
    // This prevents the confusing scenario where signup appears to succeed
    // but verification fails because the email already exists
    console.log("Checking if email already exists:", email);
    const { data: existingEmailUser, error: emailCheckError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (emailCheckError && !emailCheckError.message?.includes("No rows")) {
      console.error("Error checking email:", emailCheckError);
      // Don't block on check errors, continue with signup
    }

    if (existingEmailUser) {
      console.log("Email already registered:", email);
      return {
        success: false,
        error:
          "This email is already registered. Please use a different email or try logging in.",
        errorCode: AUTH_ERROR_CODES.EMAIL_EXISTS,
      };
    }

    // Check if username is already taken
    const { data: existingUser, error: usernameCheckError } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle(); // Use maybeSingle instead of single to handle no results

    // Handle actual network/connection errors
    if (usernameCheckError) {
      // Only treat as network error if it's actually a fetch/connection issue
      if (
        usernameCheckError.message?.includes("fetch") ||
        usernameCheckError.message?.includes("NetworkError") ||
        usernameCheckError.message?.includes("Failed to fetch")
      ) {
        console.error("Network error checking username:", usernameCheckError);
        return {
          success: false,
          error:
            "Unable to connect to server. Please check your internet connection and try again.",
          errorCode: "NETWORK_ERROR",
        };
      }
      // For other errors, log but continue (might be a query issue, not network)
      console.log("Username check query issue:", usernameCheckError);
    }

    if (existingUser) {
      return {
        success: false,
        error: "Username already taken",
        errorCode: AUTH_ERROR_CODES.USERNAME_EXISTS,
      };
    }

    // FIXED: Use Edge Function DIRECTLY to avoid 50-second timeout
    // The database trigger is broken, causing regular signup to hang
    // Edge Function completes in 2-3 seconds instead of timing out

    console.log(
      "Using Edge Function for reliable signup (avoids timeout issue)...",
    );

    try {
      // Call the Edge Function FIRST (not as fallback)
      // This bypasses the broken trigger that causes 50-second timeouts
      const response = await fetch(
        `${env.SUPABASE_URL}/functions/v1/signup-with-verification`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: env.SUPABASE_ANON_KEY,
            Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            email,
            password,
            fullName,
            username,
            role,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error("Edge Function error:", data);

        // Check if it's because user already exists
        if (
          data.errorCode === "EMAIL_EXISTS" ||
          data.errorCode === "EMAIL_EXISTS_RESENT"
        ) {
          return {
            success: false,
            error:
              data.errorCode === "EMAIL_EXISTS_RESENT"
                ? "This email is already registered. A new verification code has been sent."
                : "This email is already registered. Please use a different email or try logging in.",
            errorCode: AUTH_ERROR_CODES.EMAIL_EXISTS,
          };
        }

        if (data.errorCode === "USERNAME_EXISTS") {
          return {
            success: false,
            error: "Username already taken",
            errorCode: AUTH_ERROR_CODES.USERNAME_EXISTS,
          };
        }

        return {
          success: false,
          error: data.error || "Signup failed. Please try again.",
          errorCode: data.errorCode || "SERVER_ERROR",
        };
      }

      console.log("✅ User created successfully via Edge Function!");
      console.log("   Completed in 2-3 seconds (not 50!)");

      // Transform the user data
      const userData = {
        id: data.user.id,
        email: data.user.email,
        emailVerified: !!data.user.email_confirmed_at,
        fullName: data.user.user_metadata?.full_name || fullName,
        username: data.user.user_metadata?.username || username,
        role: data.user.user_metadata?.role || role,
        createdAt: data.user.created_at,
      };

      // Check if user needs verification
      const needsVerification = data.needsVerification !== false;

      if (!needsVerification) {
        console.log("User is auto-confirmed, can login immediately!");
      } else {
        console.log("Verification email sent with 6-digit OTP code");
      }

      return {
        success: true,
        user: userData,
        needsVerification: needsVerification,
      };
    } catch (fetchError: any) {
      console.error("Edge Function call failed:", fetchError);

      // Network error - not a timeout, actual connection issue
      if (
        fetchError?.message?.includes("fetch") ||
        fetchError?.message?.includes("Network request failed")
      ) {
        return {
          success: false,
          error:
            "Unable to connect to server. Please check your internet connection.",
          errorCode: "NETWORK_ERROR",
        };
      }

      // Fallback error
      return {
        success: false,
        error: "Signup service unavailable. Please try again later.",
        errorCode: "SERVICE_UNAVAILABLE",
      };
    }

    if (error) {
      console.error("Sign up error details:", error);
      console.error("Full error object:", JSON.stringify(error, null, 2));

      if (
        error.status === 504 ||
        error.message?.includes("504") ||
        signupTimedOut
      ) {
        console.error("Signup timed out - calling secure Edge Function...");

        try {
          // Call the Edge Function for secure signup with verification
          const response = await fetch(
            `${env.SUPABASE_URL}/functions/v1/signup-with-verification`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: env.SUPABASE_ANON_KEY,
                Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({
                email,
                password,
                fullName,
                username,
                role,
              }),
            },
          );

          const data = await response.json();

          if (!response.ok || !data.success) {
            console.error("Edge Function error:", data);

            // Check if it's because user already exists
            if (data.errorCode === "EMAIL_EXISTS") {
              return {
                success: false,
                error:
                  "This email is already registered. Please use a different email or try logging in.",
                errorCode: AUTH_ERROR_CODES.EMAIL_EXISTS,
              };
            }

            if (data.errorCode === "USERNAME_EXISTS") {
              return {
                success: false,
                error: "Username already taken",
                errorCode: AUTH_ERROR_CODES.USERNAME_EXISTS,
              };
            }

            return {
              success: false,
              error: data.error || "Signup failed. Please try again later.",
              errorCode: data.errorCode || "SERVER_TIMEOUT",
            };
          }

          console.log("✅ User created successfully via Edge Function!");

          // Check if user needs verification or can login immediately
          const needsVerification = data.needsVerification !== false;

          if (!needsVerification) {
            console.log("User is auto-confirmed, can login immediately!");
          }

          return {
            success: true,
            user: transformUserData(data.user),
            needsVerification: needsVerification,
          };
        } catch (fetchError: any) {
          console.error("Edge Function call failed:", fetchError);
          return {
            success: false,
            error:
              "Unable to connect to signup service. Please try again later.",
            errorCode: "NETWORK_ERROR",
          };
        }
      }

      // IMPORTANT: Check for duplicate email in auth.users table
      // This catches cases where email exists in auth but not profiles
      if (
        error.message?.includes("User already registered") ||
        error.message?.includes("already been registered") ||
        error.message?.includes("duplicate key value") ||
        error.code === "user_already_exists" ||
        error.code === "email_exists"
      ) {
        console.log("Signup failed: Email already exists in auth.users");
        return {
          success: false,
          error:
            "This email is already registered. Please use a different email or try logging in.",
          errorCode: AUTH_ERROR_CODES.EMAIL_EXISTS,
        };
      }

      // Check for specific password issues
      if (error.message?.includes("Password must be at least")) {
        return {
          success: false,
          error: error.message,
          errorCode: "WEAK_PASSWORD",
        };
      }

      // Check for weak password from Supabase
      if (error.message?.includes("weak_password")) {
        return {
          success: false,
          error:
            "Password is too weak. Please use a stronger password with at least 8 characters.",
          errorCode: "WEAK_PASSWORD",
        };
      }

      // Check for network errors
      if (
        error.message?.includes("fetch") ||
        error.message?.includes("Network request failed")
      ) {
        return {
          success: false,
          error:
            "Network connection failed. Please check your internet connection and try again.",
          errorCode: "NETWORK_ERROR",
        };
      }

      // Check for specific error types
      if (
        error.message?.includes("already registered") ||
        error.message?.includes("already exists")
      ) {
        return {
          success: false,
          error: "Email already registered",
          errorCode: AUTH_ERROR_CODES.EMAIL_EXISTS,
        };
      }

      if (error.message?.includes("weak password")) {
        return {
          success: false,
          error: "Password is too weak",
          errorCode: AUTH_ERROR_CODES.WEAK_PASSWORD,
        };
      }

      throw error;
    }

    // Log for development - helps with email configuration issues
    if (__DEV__ && data?.user) {
      console.log("=================================");
      console.log("SIGN UP SUCCESSFUL - Email Verification Required");
      console.log("Email sent to:", email);
      console.log("User ID:", (data.user as any).id);
      console.log("Check your email for the 6-digit verification code");
      console.log("If using default Supabase email, check spam folder");
      console.log("=================================");
    }

    // Add detailed logging for successful signup
    if (data?.user) {
      const userData = transformUserData(data.user);

      console.log("✅ Signup Summary:");
      console.log("  - User ID:", data.user.id);
      console.log("  - Email:", data.user.email);
      console.log("  - Role:", userData.role);
      console.log("  - Username:", userData.username);
      console.log(
        "  - Email verified:",
        data.user.email_confirmed_at ? "Yes" : "No",
      );
      console.log("  - Session created:", data.session ? "Yes" : "No");

      // Warn if no session was created (might indicate password issue)
      if (!data.session) {
        console.warn(
          "⚠️ No session created during signup - user will need to verify email first",
        );
        console.log("  This is normal for email verification flow");
      }

      return {
        success: true,
        user: userData,
      };
    }

    // If we get here, something went wrong but no error was thrown
    console.error("⚠️ Signup completed but no user data returned");
    return {
      success: false,
      error: "Signup process completed but user data was not returned",
      errorCode: "SIGNUP_INCOMPLETE",
    };
  } catch (error: any) {
    console.error("Unexpected sign up error:", error);

    // Better network error handling
    if (
      error?.message?.includes("fetch") ||
      error?.message?.includes("Network request failed")
    ) {
      return {
        success: false,
        error:
          "Unable to connect to server. Please check your internet connection.",
        errorCode: "NETWORK_ERROR",
      };
    }

    const authError = error as AuthError;
    return {
      success: false,
      error: authError.message || "Sign up failed. Please try again.",
      errorCode: authError.code || AUTH_ERROR_CODES.UNKNOWN,
    };
  }
}

/**
 * Get current user
 */
export async function getUser() {
  try {
    const { user, error } = await authHelpers.getUser();

    if (error) {
      console.error("Get user error:", error);
      return null;
    }

    if (user) {
      return transformUserData(user);
    }

    return null;
  } catch (error) {
    console.error("Failed to get user:", error);
    return null;
  }
}

/**
 * Resend verification code to email
 */
export async function resendVerificationCode(
  email: string,
): Promise<LoginResult> {
  if (!validateEmail(email)) {
    return {
      success: false,
      error: "Invalid email address",
      errorCode: "VALIDATION_ERROR",
    };
  }

  try {
    const { error } = await authHelpers.resendOtp(email);

    if (error) {
      throw error;
    }

    return {
      success: true,
    };
  } catch (error) {
    const authError = error as AuthError;
    return {
      success: false,
      error: authError.message || "Failed to resend code",
      errorCode: authError.code || AUTH_ERROR_CODES.UNKNOWN,
    };
  }
}
