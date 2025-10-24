import { supabase, authHelpers } from "../lib/supabase";
import { validateEmail } from "../utils/validation";
import { transformUserData } from "../utils/auth";
import { AUTH_ERROR_CODES } from "../utils/auth-errors";

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
 * WORKAROUND: Two-step signup to bypass the broken trigger
 *
 * The normal signup flow is timing out because there's a database trigger
 * on auth.users that tries to create a profile but hangs. This workaround:
 *
 * 1. Creates the user in auth.users (will timeout but user gets created)
 * 2. Manually creates the profile after a delay
 * 3. Returns success even if step 1 times out
 */
export async function signUpUserWorkaround(
  credentials: SignUpCredentials
): Promise<SignUpResult> {
  const { fullName, username, email, password, role } = credentials;

  // Validate inputs
  if (!email?.trim() || !password?.trim() || !username?.trim() || !fullName?.trim()) {
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
    console.log("🔧 Using workaround signup flow for:", email);

    // Step 1: Check if email already exists in profiles
    const { data: existingEmailUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (existingEmailUser) {
      return {
        success: false,
        error: "This email is already registered. Please use a different email or try logging in.",
        errorCode: AUTH_ERROR_CODES.EMAIL_EXISTS,
      };
    }

    // Step 2: Check if username is taken
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (existingUser) {
      return {
        success: false,
        error: "Username already taken",
        errorCode: AUTH_ERROR_CODES.USERNAME_EXISTS,
      };
    }

    // Step 3: Attempt signup with a timeout wrapper
    console.log("Attempting signup (may timeout)...");

    let signupTimedOut = false;
    let userId: string | null = null;

    // Create a timeout promise
    const timeoutPromise = new Promise<{ data: null; error: any }>((resolve) => {
      setTimeout(() => {
        signupTimedOut = true;
        resolve({
          data: null,
          error: { message: "Signup timed out but may have succeeded", status: 504 }
        });
      }, 10000); // 10 second timeout
    });

    // Race between signup and timeout
    const signupPromise = authHelpers.signUp(email, password, {
      full_name: fullName,
      username,
      role,
    });

    const result = await Promise.race([signupPromise, timeoutPromise]);

    if (result.error) {
      // Check if it's a real error or just a timeout
      if (result.error.status === 504 || signupTimedOut) {
        console.log("⏱️ Signup timed out, checking if user was created...");

        // Wait a bit for the user to be created
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Try to sign in with the credentials to get the user ID
        const { data: signInData } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInData?.user) {
          userId = signInData.user.id;
          console.log("✅ User was created despite timeout:", userId);

          // Sign out immediately since we're just checking
          await supabase.auth.signOut();
        } else {
          // User wasn't created, this is a real failure
          return {
            success: false,
            error: "Signup failed. The service is experiencing issues. Please try again later.",
            errorCode: "SERVER_TIMEOUT",
          };
        }
      } else if (
        result.error.message?.includes("User already registered") ||
        result.error.message?.includes("already been registered")
      ) {
        return {
          success: false,
          error: "This email is already registered.",
          errorCode: AUTH_ERROR_CODES.EMAIL_EXISTS,
        };
      } else {
        // Other errors
        throw result.error;
      }
    } else if (result.data?.user) {
      // Normal successful signup
      userId = result.data.user.id;
      console.log("✅ Signup succeeded normally:", userId);
    }

    // Step 4: Create the profile manually if we have a user ID
    if (userId) {
      console.log("📝 Creating profile for user:", userId);

      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          email: email.toLowerCase(),
          full_name: fullName,
          username,
          role,
          phone: null,
          avatar_url: null,
          verified_provider: false,
          verification_status: null,
          verification_documents: null,
          seeker_profile: {},
          provider_profile: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.error("⚠️ Profile creation failed:", profileError.message);
        // Profile might already exist from the trigger, that's ok
        if (!profileError.message?.includes("duplicate")) {
          console.error("Profile creation error (non-duplicate):", profileError);
        }
      } else {
        console.log("✅ Profile created successfully");
      }

      // Return success
      return {
        success: true,
        user: {
          id: userId,
          email,
          fullName,
          username,
          role
        },
        needsVerification: true,
      };
    }

    // Shouldn't get here
    return {
      success: false,
      error: "Signup failed unexpectedly",
      errorCode: "UNKNOWN",
    };

  } catch (error: any) {
    console.error("Signup error:", error);

    if (error?.message?.includes("fetch") || error?.message?.includes("NetworkError")) {
      return {
        success: false,
        error: "Unable to connect to server. Please check your internet connection.",
        errorCode: "NETWORK_ERROR",
      };
    }

    return {
      success: false,
      error: error.message || "An error occurred during signup",
      errorCode: error.code || AUTH_ERROR_CODES.UNKNOWN,
    };
  }
}

/**
 * Export as the main signup function
 * Replace the import in your app to use this workaround
 */
export const signUpUser = signUpUserWorkaround;