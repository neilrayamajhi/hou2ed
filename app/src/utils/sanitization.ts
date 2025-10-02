/**
 * Input sanitization utilities for security
 */

/**
 * Remove dangerous characters and scripts from input
 */
export function sanitizeInput(input: string): string {
  if (!input) return "";

  // Remove any script tags and their content
  let sanitized = input.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    "",
  );

  // Remove other dangerous tags
  sanitized = sanitized.replace(
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    "",
  );
  sanitized = sanitized.replace(
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    "",
  );
  sanitized = sanitized.replace(
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
    "",
  );

  // Remove event handlers
  sanitized = sanitized.replace(/on\w+\s*=\s*"[^"]*"/gi, "");
  sanitized = sanitized.replace(/on\w+\s*=\s*'[^']*'/gi, "");
  sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, "");

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, "");

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Sanitize email input
 */
export function sanitizeEmail(email: string): string {
  if (!email) return "";

  // Convert to lowercase
  let sanitized = email.toLowerCase();

  // Remove any whitespace
  sanitized = sanitized.replace(/\s/g, "");

  // Remove any HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, "");

  // Basic email validation pattern
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailPattern.test(sanitized)) {
    return "";
  }

  return sanitized;
}

/**
 * Sanitize username input
 */
export function sanitizeUsername(username: string): string {
  if (!username) return "";

  // Remove any non-alphanumeric characters except underscore
  let sanitized = username.replace(/[^a-zA-Z0-9_]/g, "");

  // Limit length
  sanitized = sanitized.substring(0, 30);

  return sanitized;
}

/**
 * Sanitize password (minimal sanitization to avoid breaking valid passwords)
 */
export function sanitizePassword(password: string): string {
  if (!password) return "";

  // Only remove leading/trailing whitespace
  // Don't modify the password content as it may contain special chars
  return password.trim();
}

/**
 * Sanitize phone number
 */
export function sanitizePhoneNumber(phone: string): string {
  if (!phone) return "";

  // Remove all non-numeric characters except + at the beginning
  let sanitized = phone.replace(/[^\d+]/g, "");

  // Ensure + is only at the beginning
  if (sanitized.includes("+") && !sanitized.startsWith("+")) {
    sanitized = sanitized.replace(/\+/g, "");
  }

  // Limit length (international numbers can be up to 15 digits)
  sanitized = sanitized.substring(0, 16); // +15 digits

  return sanitized;
}

/**
 * Escape HTML entities to prevent XSS
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
    "/": "&#x2F;",
  };

  return text.replace(/[&<>"'\/]/g, (char) => map[char] || char);
}

/**
 * Remove SQL injection attempts
 */
export function sanitizeSqlInput(input: string): string {
  if (!input) return "";

  // Remove common SQL injection patterns
  let sanitized = input.replace(
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC|EXECUTE)\b)/gi,
    "",
  );

  // Remove SQL comments
  sanitized = sanitized.replace(/--/g, "");
  sanitized = sanitized.replace(/\/\*/g, "");
  sanitized = sanitized.replace(/\*\//g, "");

  // Remove dangerous characters for SQL
  sanitized = sanitized.replace(/[;'"`]/g, "");

  return sanitized;
}

/**
 * General purpose input sanitizer
 */
export function sanitizeGenericInput(
  input: string,
  options?: {
    allowHtml?: boolean;
    maxLength?: number;
    allowSpecialChars?: boolean;
  },
): string {
  if (!input) return "";

  let sanitized = input;

  // Apply SQL injection protection
  sanitized = sanitizeSqlInput(sanitized);

  // Apply XSS protection if HTML not allowed
  if (!options?.allowHtml) {
    sanitized = sanitizeInput(sanitized);
    sanitized = escapeHtml(sanitized);
  }

  // Remove special characters if not allowed
  if (!options?.allowSpecialChars) {
    sanitized = sanitized.replace(/[^\w\s-_.@]/g, "");
  }

  // Apply length limit
  if (options?.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }

  return sanitized.trim();
}
