/**
 * Authentication constants
 */

export const AUTH_CONSTANTS = {
  // Timing
  OTP_RESEND_DELAY_SECONDS: 30,
  OTP_CODE_LENGTH: 6,
  VERIFICATION_DELAY_MS: 1500,
  SESSION_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes

  // Validation
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  MIN_USERNAME_LENGTH: 3,
  MAX_USERNAME_LENGTH: 30,

  // Rate limiting
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_LOCKOUT_DURATION_MS: 15 * 60 * 1000, // 15 minutes

  // Animations
  BRAND_PANEL_HEIGHT: 120,
  ANIMATION_DURATION_MS: 300,

  // Security
  PASSWORD_REQUIREMENTS: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecialChar: false,
  },
} as const;

export const AUTH_REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  USERNAME: /^[a-zA-Z0-9_]{3,30}$/,
  STRONG_PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
  PHONE: /^\+?1?\d{10,14}$/,
} as const;

export const AUTH_MESSAGES = {
  VALIDATION: {
    EMAIL_REQUIRED: "Email is required",
    EMAIL_INVALID: "Please enter a valid email address",
    USERNAME_REQUIRED: "Username is required",
    USERNAME_INVALID:
      "Username must be 3-30 characters and contain only letters, numbers, and underscores",
    PASSWORD_REQUIRED: "Password is required",
    PASSWORD_TOO_SHORT: `Password must be at least ${AUTH_CONSTANTS.MIN_PASSWORD_LENGTH} characters`,
    PASSWORD_TOO_LONG: `Password must be less than ${AUTH_CONSTANTS.MAX_PASSWORD_LENGTH} characters`,
    PASSWORD_WEAK: "Password must contain uppercase, lowercase, and numbers",
    PASSWORDS_DONT_MATCH: "Passwords do not match",
  },
  SUCCESS: {
    LOGIN: "Login successful",
    SIGNUP: "Account created successfully",
    PASSWORD_RESET: "Password reset email sent",
    VERIFICATION: "Email verified successfully",
  },
  ERROR: {
    LOGIN_FAILED: "Login failed. Please try again.",
    SIGNUP_FAILED: "Signup failed. Please try again.",
    INVALID_CREDENTIALS: "Invalid email/username or password",
    EMAIL_NOT_VERIFIED: "Please verify your email before logging in",
    USER_NOT_FOUND: "User not found",
    TOO_MANY_ATTEMPTS: "Too many login attempts. Please try again later.",
    NETWORK_ERROR: "Network error. Please check your connection.",
    UNKNOWN: "An unexpected error occurred",
  },
} as const;
