export const ERROR_MESSAGES = {
  // Authentication errors
  AUTH: {
    INVALID_CREDENTIALS: "Invalid email or password",
    EMAIL_NOT_VERIFIED: "Please check your email to verify your account",
    ACCOUNT_EXISTS: "An account with this email already exists",
    WEAK_PASSWORD: "Please choose a stronger password",
    SIGN_UP_FAILED: "Sign up failed. Please try again later",
    LOGIN_FAILED: "Login failed. Please try again",
    VERIFICATION_FAILED:
      "Verification failed. Please try again or request a new code",
    INVALID_CODE: "Invalid verification code",
    RESET_FAILED: "Failed to send reset email",
    SESSION_ERROR: "Session check failed",
    SIGN_OUT_ERROR: "Sign out failed",
    USERNAME_LOGIN_UNAVAILABLE:
      "Username login coming soon. Please use your email for now",
  },

  // Validation errors
  VALIDATION: {
    REQUIRED_FIELD: "This field is required",
    INVALID_EMAIL: "Please enter a valid email address",
    PASSWORD_MISMATCH: "Passwords don't match",
    USERNAME_FORMAT:
      "Username can only contain letters, numbers, and underscores",
    MIN_LENGTH: (field: string, length: number) =>
      `${field} must be at least ${length} characters`,
  },

  // Network errors
  NETWORK: {
    CONNECTION_ERROR:
      "Connection error. Please check your internet and try again",
    TIMEOUT: "Request timed out. Please try again",
    SERVER_ERROR: "Server error. Please try again later",
  },
} as const;

export const SUCCESS_MESSAGES = {
  AUTH: {
    SIGN_UP: "Account created successfully!",
    LOGIN: "Welcome back!",
    VERIFICATION: "Your account has been verified!",
    RESET_SENT: "Check your email for the password reset link",
    CODE_RESENT: "A new verification code has been sent to your email",
    SIGN_OUT: "You have been signed out",
  },

  PROFILE: {
    UPDATED: "Profile updated successfully",
    PHOTO_UPLOADED: "Photo uploaded successfully",
  },
} as const;

export const PLACEHOLDER_TEXT = {
  EMAIL: "Enter your email",
  PASSWORD: "Enter your password",
  USERNAME: "Choose a username",
  FULL_NAME: "Enter your full name",
  EMAIL_OR_USERNAME: "Enter your email or username",
  CONFIRM_PASSWORD: "Confirm your password",
} as const;

export const BUTTON_TEXT = {
  SIGN_UP: "Sign Up",
  LOGIN: "Log In",
  SIGN_OUT: "Sign Out",
  VERIFY: "Verify",
  RESEND: "Resend Code",
  CONTINUE: "Continue",
  CANCEL: "Cancel",
  SAVE: "Save",
  RESET_PASSWORD: "Reset Password",
  FORGOT_PASSWORD: "Forgot Password?",
} as const;
