import { supabase, authHelpers } from "../lib/supabase";
import { validateEmail } from "../utils/validation";
import { transformUserData, retryWithBackoff } from "../utils/auth";
import { AuthError, AUTH_ERROR_CODES } from "../utils/auth-errors";

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
    const { data, error } = await supabase.rpc("get_email_from_username", {
      p_username: username,
    });

    if (error) {
      console.error("Error resolving username:", error);
      return null;
    }

    return data || null;
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
 * Performs the authentication with retry logic
 */
async function performAuthentication(email: string, password: string) {
  // Don't clear session before login - this causes auth state issues
  // The new login will replace any existing session automatically
  return retryWithBackoff(() => authHelpers.signIn(email, password));
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
      console.log("✅ Fresh Supabase client should have clean session state");

      const userData = await transformUserData(data.user);
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
      const userData = await transformUserData(data.user);
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
        const userData = await transformUserData(user);
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
  needsVerification?: boolean;
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

      // Try to resend verification code to check if account is unverified
      console.log("Attempting to resend OTP to check verification status...");
      const { error: resendError } = await authHelpers.resendOtp(email);

      if (!resendError) {
        // Resend succeeded = account exists but is unverified
        console.log(
          "Account exists but is unverified. Resending verification code.",
        );
        return {
          success: false,
          error: email,
          errorCode: AUTH_ERROR_CODES.EMAIL_UNVERIFIED_EXISTING,
        };
      }

      // Resend failed = account is verified or other error
      console.log("Email already registered and verified:", email);
      return {
        success: false,
        error:
          "This email is already registered. Please use a different email or try logging in.",
        errorCode: AUTH_ERROR_CODES.EMAIL_EXISTS,
      };
    }

    // Note: We can't easily detect orphaned accounts from the client
    // The fix is to ensure profile creation always works (see below)

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

    // Sign up with Supabase using retry logic
    const { data, error } = await retryWithBackoff(() =>
      authHelpers.signUp(email, password, {
        full_name: fullName,
        username,
        role,
      }),
    );

    if (error) {
      console.error("Sign up error details:", error);
      console.error("Full error object:", JSON.stringify(error, null, 2));

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

    // Profile is created automatically by database trigger
    if (data?.user) {
      console.log("✅ Auth user created");
      console.log(
        "  Profile will be created by database trigger (SECURITY DEFINER)",
      );

      // Wait longer for trigger to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const userData = await transformUserData(data.user);

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
      console.log("  - Profile created: By database trigger");

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
        needsVerification: !data.session,
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
      return await transformUserData(user);
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
