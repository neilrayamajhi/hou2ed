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
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("email")
      .eq("username", username)
      .single();

    if (error || !profile) {
      return null;
    }

    return profile.email;
  } catch (error) {
    console.error("Error resolving username:", error);
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
    // Resolve email from username if needed
    const email = await resolveEmail(emailOrUsername);

    if (!email) {
      return {
        success: false,
        error: "Username not found",
        errorCode: AUTH_ERROR_CODES.USER_NOT_FOUND,
      };
    }

    // Perform authentication
    const { data, error } = await performAuthentication(email, password);

    if (error) {
      throw error;
    }

    if (data?.user) {
      const userData = transformUserData(data.user);
      return {
        success: true,
        user: userData,
      };
    }

    return {
      success: false,
      error: "Login failed",
      errorCode: AUTH_ERROR_CODES.UNKNOWN,
    };
  } catch (error) {
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
    const { data, error } = await authHelpers.verifyOtp(email, code);

    if (error) {
      throw error;
    }

    if (data?.user) {
      const userData = transformUserData(data.user);
      return {
        success: true,
        user: userData,
      };
    }

    return {
      success: false,
      error: "Verification failed",
      errorCode: AUTH_ERROR_CODES.UNKNOWN,
    };
  } catch (error) {
    const authError = error as AuthError;
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
    // Check if username is already taken
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .single();

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

    return {
      success: true,
      user: data?.user ? transformUserData(data.user) : null,
    };
  } catch (error) {
    const authError = error as AuthError;
    return {
      success: false,
      error: authError.message || "Sign up failed",
      errorCode: authError.code || AUTH_ERROR_CODES.UNKNOWN,
    };
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
