import { supabase, authHelpers } from "../lib/supabase";
import { validateEmail } from "../utils/validation";
import { transformUserData } from "../utils/auth";
import { AuthError, AUTH_ERROR_CODES } from "../utils/auth-errors";
import { env } from "../utils/env";

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
  needsVerification?: boolean;
  error?: string;
  errorCode?: string;
}

/**
 * Call the Edge Function for secure signup
 * This bypasses the broken trigger and creates users reliably
 */
async function callSecureSignupFunction(
  email: string,
  password: string,
  fullName: string,
  username: string,
  role: "seeker" | "provider"
): Promise<SignUpResult> {
  try {
    console.log("🔐 Calling secure signup Edge Function...");

    const response = await fetch(
      `${env.SUPABASE_URL}/functions/v1/secure-signup`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          email,
          password,
          fullName,
          username,
          role,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error("Edge Function returned error:", data);
      return {
        success: false,
        error: data.error || "Signup failed",
        errorCode: data.errorCode || "EDGE_FUNCTION_ERROR",
      };
    }

    console.log("✅ User created successfully via Edge Function");
    return {
      success: true,
      user: data.user,
      needsVerification: true,
    };

  } catch (error: any) {
    console.error("Edge Function call failed:", error);
    return {
      success: false,
      error: "Failed to connect to signup service",
      errorCode: "NETWORK_ERROR",
    };
  }
}

/**
 * Production-ready signup function
 *
 * This function:
 * 1. Validates inputs
 * 2. Checks for existing email/username
 * 3. Attempts normal signup
 * 4. Falls back to Edge Function if timeout occurs
 * 5. Handles all error cases gracefully
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

  if (password.length < 8) {
    return {
      success: false,
      error: "Password must be at least 8 characters",
      errorCode: "WEAK_PASSWORD",
    };
  }

  try {
    console.log("Starting signup process for:", email);

    // Check if email already exists
    const { data: existingEmailUser, error: emailCheckError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (emailCheckError && !emailCheckError.message?.includes("No rows")) {
      console.error("Error checking email:", emailCheckError);
    }

    if (existingEmailUser) {
      console.log("Email already registered:", email);
      return {
        success: false,
        error: "This email is already registered. Please use a different email or try logging in.",
        errorCode: AUTH_ERROR_CODES.EMAIL_EXISTS,
      };
    }

    // Check if username is already taken
    const { data: existingUser, error: usernameCheckError } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (usernameCheckError && !usernameCheckError.message?.includes("No rows")) {
      console.log("Username check query issue:", usernameCheckError);
    }

    if (existingUser) {
      return {
        success: false,
        error: "Username already taken",
        errorCode: AUTH_ERROR_CODES.USERNAME_EXISTS,
      };
    }

    // Try normal signup with a timeout
    console.log("Attempting normal signup...");

    let signupTimedOut = false;
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        signupTimedOut = true;
        resolve({ data: null, error: { status: 504, message: "Controlled timeout" } });
      }, 5000); // 5 second timeout for normal signup
    });

    const signupPromise = authHelpers.signUp(email, password, {
      full_name: fullName,
      username,
      role,
    });

    const signupResult: any = await Promise.race([signupPromise, timeoutPromise]);
    const { data, error } = signupResult;

    // If signup succeeded normally, return success
    if (data?.user && !error) {
      console.log("✅ Normal signup succeeded");

      // Check for Supabase's duplicate email quirk
      if (!data.user.identities || data.user.identities.length === 0) {
        console.warn('Duplicate email detected - user returned with no identities');
        return {
          success: false,
          error: 'This email is already registered. Please use a different email or try logging in.',
          errorCode: AUTH_ERROR_CODES.EMAIL_EXISTS,
        };
      }

      return {
        success: true,
        user: transformUserData(data.user),
        needsVerification: true,
      };
    }

    // If there's an error or timeout, use Edge Function
    if (error) {
      console.log("Normal signup failed/timed out, switching to Edge Function...");

      // For timeout or 504 errors, use Edge Function
      if (error.status === 504 || signupTimedOut || error.message?.includes("504")) {
        console.log("Timeout detected - using secure Edge Function...");
        return await callSecureSignupFunction(email, password, fullName, username, role);
      }

      // For duplicate email errors
      if (
        error.message?.includes("User already registered") ||
        error.message?.includes("already been registered") ||
        error.message?.includes("duplicate key value") ||
        error.code === "user_already_exists" ||
        error.code === "email_exists"
      ) {
        return {
          success: false,
          error: "This email is already registered. Please use a different email or try logging in.",
          errorCode: AUTH_ERROR_CODES.EMAIL_EXISTS,
        };
      }

      // For password errors
      if (error.message?.includes("Password")) {
        return {
          success: false,
          error: error.message,
          errorCode: "WEAK_PASSWORD",
        };
      }

      // For network errors
      if (
        error?.message?.includes("fetch") ||
        error?.message?.includes("NetworkError") ||
        error?.message?.includes("Failed to fetch")
      ) {
        console.log("Network error - trying Edge Function as fallback...");
        return await callSecureSignupFunction(email, password, fullName, username, role);
      }

      // For any other errors, try Edge Function as last resort
      console.log("Unknown error - trying Edge Function as fallback...");
      return await callSecureSignupFunction(email, password, fullName, username, role);
    }

    // Shouldn't reach here, but if we do, try Edge Function
    return await callSecureSignupFunction(email, password, fullName, username, role);

  } catch (error: any) {
    console.error("Unexpected signup error:", error);

    // As a final fallback, try the Edge Function
    console.log("Unexpected error - using Edge Function as final fallback...");
    return await callSecureSignupFunction(email, password, fullName, username, role);
  }
}