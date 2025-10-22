/**
 * OTP (One-Time Password) utility functions
 */

/**
 * Validate if a string contains only a single digit
 */
export function isValidOTPDigit(value: string): boolean {
  return /^\d$/.test(value);
}

/**
 * Extract digits from a string (for paste operations)
 */
export function extractDigitsFromString(
  input: string,
  maxLength: number,
): string {
  return input.replace(/\D/g, "").slice(0, maxLength);
}

/**
 * Format timer seconds to MM:SS format
 */
export function formatTimerDisplay(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Calculate minutes from milliseconds (for user display)
 */
export function millisecondsToMinutes(ms: number): number {
  return Math.ceil(ms / 60000);
}

/**
 * Validate complete OTP code
 */
export function isCompleteOTPCode(
  code: string[],
  expectedLength: number,
): boolean {
  return code.filter((digit) => digit).length === expectedLength;
}

/**
 * Create empty OTP array
 */
export function createEmptyOTPArray(length: number): string[] {
  return Array(length).fill("");
}

/**
 * Parse pasted OTP text into array
 */
export function parsePastedOTP(pastedText: string, length: number): string[] {
  const digits = extractDigitsFromString(pastedText, length);
  const otpArray = createEmptyOTPArray(length);

  for (let i = 0; i < digits.length; i++) {
    otpArray[i] = digits[i];
  }

  return otpArray;
}

/**
 * Find next empty OTP input index
 */
export function findNextEmptyIndex(code: string[]): number {
  const index = code.findIndex((digit) => !digit);
  return index === -1 ? code.length - 1 : index;
}

