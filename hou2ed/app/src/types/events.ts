/**
 * Type definitions for React Native events
 */

import { NativeSyntheticEvent, TextInputKeyPressEventData } from "react-native";

/**
 * Keyboard event for TextInput key press
 */
export type KeyPressEvent = NativeSyntheticEvent<TextInputKeyPressEventData>;

/**
 * Generic error type for API responses
 */
export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
  details?: unknown;
}

/**
 * Auth error type with specific auth error codes
 */
export interface AuthError extends ApiError {
  code?:
    | "invalid_credentials"
    | "email_not_confirmed"
    | "user_not_found"
    | "rate_limit_exceeded";
}

