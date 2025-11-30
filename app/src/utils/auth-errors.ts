/**
 * Auth error type definitions and handlers
 */

export interface AuthError extends Error {
  code?: string;
  statusCode?: number;
}

export const AUTH_ERROR_CODES = {
  INVALID_CREDENTIALS: "invalid_credentials",
  EMAIL_NOT_VERIFIED: "email_not_confirmed",
  EMAIL_UNVERIFIED_EXISTING: "email_unverified_existing",
  USER_NOT_FOUND: "user_not_found",
  EMAIL_EXISTS: "email_exists",
  USERNAME_EXISTS: "username_exists",
  WEAK_PASSWORD: "weak_password",
  NETWORK_ERROR: "network_error",
  RATE_LIMITED: "rate_limited",
  UNKNOWN: "unknown_error",
} as const;

export function classifyAuthError(error: unknown): string {
  if (!error) return AUTH_ERROR_CODES.UNKNOWN;

  const errorMessage = (error as Error).message?.toLowerCase() || "";

  if (errorMessage.includes("invalid login credentials")) {
    return AUTH_ERROR_CODES.INVALID_CREDENTIALS;
  }

  if (errorMessage.includes("email not confirmed")) {
    return AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED;
  }

  if (errorMessage.includes("user not found")) {
    return AUTH_ERROR_CODES.USER_NOT_FOUND;
  }

  if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
    return AUTH_ERROR_CODES.NETWORK_ERROR;
  }

  return AUTH_ERROR_CODES.UNKNOWN;
}
