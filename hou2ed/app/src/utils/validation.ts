/**
 * Email validation utility
 * @param email - The email string to validate
 * @returns true if email is valid, false otherwise
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Password validation utility
 * @param password - The password string to validate
 * @returns true if password meets requirements, false otherwise
 */
export const validatePassword = (password: string): boolean => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
};

/**
 * Phone number validation utility
 * @param phone - The phone string to validate
 * @returns true if phone number is valid, false otherwise
 */
export const validatePhoneNumber = (phone: string): boolean => {
  // Basic US phone number validation
  const phoneRegex = /^\+?1?\d{10,14}$/;
  return phoneRegex.test(phone.replace(/[\s()-]/g, ""));
};
