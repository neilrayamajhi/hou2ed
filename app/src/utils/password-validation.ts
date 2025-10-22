/**
 * Password validation utilities
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  strength: 'weak' | 'medium' | 'strong';
}

/**
 * Validate password strength and requirements
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let strength: 'weak' | 'medium' | 'strong' = 'weak';

  // Check minimum length (required)
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
    return { isValid: false, errors, warnings, strength };
  }

  // Check for spaces at beginning or end
  if (password !== password.trim()) {
    errors.push('Password cannot start or end with spaces');
    return { isValid: false, errors, warnings, strength };
  }

  // Check password strength
  let strengthScore = 0;

  // Has lowercase letters
  if (/[a-z]/.test(password)) {
    strengthScore++;
  } else {
    warnings.push('Add lowercase letters for stronger password');
  }

  // Has uppercase letters
  if (/[A-Z]/.test(password)) {
    strengthScore++;
  } else {
    warnings.push('Add uppercase letters for stronger password');
  }

  // Has numbers
  if (/\d/.test(password)) {
    strengthScore++;
  } else {
    warnings.push('Add numbers for stronger password');
  }

  // Has special characters
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    strengthScore++;
  } else {
    warnings.push('Add special characters for stronger password');
  }

  // Length bonus
  if (password.length >= 12) {
    strengthScore++;
  }

  // Determine strength
  if (strengthScore <= 2) {
    strength = 'weak';
    if (password.length < 10) {
      warnings.push('Weak password - consider making it longer');
    }
  } else if (strengthScore <= 3) {
    strength = 'medium';
  } else {
    strength = 'strong';
  }

  // Check for common weak patterns
  const commonWeakPasswords = [
    'password', 'Password', '12345678', '123456789',
    'qwerty', 'Qwerty', 'abc12345', 'Password1'
  ];

  if (commonWeakPasswords.some(weak => password.toLowerCase().includes(weak.toLowerCase()))) {
    warnings.push('Password contains common patterns - consider changing it');
    strength = 'weak';
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    strength
  };
}

/**
 * Generate a strong password suggestion
 */
export function generateStrongPassword(length: number = 16): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|:;<>?,.';

  const allChars = lowercase + uppercase + numbers + symbols;

  let password = '';

  // Ensure at least one of each type
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Check if passwords match
 */
export function passwordsMatch(password1: string, password2: string): boolean {
  return password1 === password2;
}

/**
 * Sanitize password (remove potentially problematic characters)
 */
export function sanitizePassword(password: string): string {
  // Don't actually modify the password, just trim whitespace
  // We want to allow all characters in passwords
  return password.trim();
}