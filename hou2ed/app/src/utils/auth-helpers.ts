/**
 * Comprehensive authentication helper utilities
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import { AUTH_CONSTANTS, AUTH_MESSAGES } from "../constants/auth.constants";

/**
 * Session management utilities
 */
export class SessionManager {
  private static readonly SESSION_KEY = "@hou2ed_session";
  private static readonly REFRESH_TOKEN_KEY = "@hou2ed_refresh_token";
  private static readonly SESSION_EXPIRY_KEY = "@hou2ed_session_expiry";

  static async saveSession(
    token: string,
    refreshToken?: string,
    expiresIn?: number,
  ) {
    try {
      await AsyncStorage.setItem(this.SESSION_KEY, token);

      if (refreshToken) {
        await AsyncStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
      }

      if (expiresIn) {
        const expiryTime = Date.now() + expiresIn * 1000;
        await AsyncStorage.setItem(
          this.SESSION_EXPIRY_KEY,
          expiryTime.toString(),
        );
      }
    } catch (error) {
      console.error("Error saving session:", error);
      throw new Error("Failed to save session");
    }
  }

  static async getSession() {
    try {
      const token = await AsyncStorage.getItem(this.SESSION_KEY);
      const expiryTime = await AsyncStorage.getItem(this.SESSION_EXPIRY_KEY);

      if (!token) return null;

      // Check if session expired
      if (expiryTime && Date.now() > parseInt(expiryTime)) {
        await this.clearSession();
        return null;
      }

      return token;
    } catch (error) {
      console.error("Error getting session:", error);
      return null;
    }
  }

  static async getRefreshToken() {
    try {
      return await AsyncStorage.getItem(this.REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error("Error getting refresh token:", error);
      return null;
    }
  }

  static async clearSession() {
    try {
      await AsyncStorage.multiRemove([
        this.SESSION_KEY,
        this.REFRESH_TOKEN_KEY,
        this.SESSION_EXPIRY_KEY,
      ]);
    } catch (error) {
      console.error("Error clearing session:", error);
    }
  }

  static async isSessionValid(): Promise<boolean> {
    const session = await this.getSession();
    return session !== null;
  }
}

/**
 * Biometric authentication utilities
 */
export class BiometricAuth {
  static async isAvailable(): Promise<boolean> {
    // This would integrate with expo-local-authentication
    // For now, returning false as placeholder
    return false;
  }

  static async authenticate(reason: string): Promise<boolean> {
    // Placeholder for biometric authentication
    return false;
  }
}

/**
 * Password strength checker
 */
export class PasswordStrength {
  static calculate(password: string): {
    score: number;
    strength: "weak" | "fair" | "good" | "strong";
    suggestions: string[];
  } {
    let score = 0;
    const suggestions: string[] = [];

    // Length check
    if (password.length >= AUTH_CONSTANTS.MIN_PASSWORD_LENGTH) {
      score += 20;
    } else {
      suggestions.push(
        `Use at least ${AUTH_CONSTANTS.MIN_PASSWORD_LENGTH} characters`,
      );
    }

    if (password.length >= 12) {
      score += 10;
    }

    // Uppercase check
    if (/[A-Z]/.test(password)) {
      score += 20;
    } else {
      suggestions.push("Add uppercase letters");
    }

    // Lowercase check
    if (/[a-z]/.test(password)) {
      score += 20;
    } else {
      suggestions.push("Add lowercase letters");
    }

    // Number check
    if (/\d/.test(password)) {
      score += 20;
    } else {
      suggestions.push("Add numbers");
    }

    // Special character check
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 10;
    } else {
      suggestions.push("Add special characters for extra security");
    }

    // Determine strength
    let strength: "weak" | "fair" | "good" | "strong";
    if (score < 40) {
      strength = "weak";
    } else if (score < 60) {
      strength = "fair";
    } else if (score < 80) {
      strength = "good";
    } else {
      strength = "strong";
    }

    return { score, strength, suggestions };
  }

  static generateStrong(): string {
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const special = "!@#$%^&*()_+-=[]{}|;:,.<>?";
    const all = uppercase + lowercase + numbers + special;

    let password = "";

    // Ensure at least one of each type
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Fill the rest randomly
    for (let i = password.length; i < 16; i++) {
      password += all[Math.floor(Math.random() * all.length)];
    }

    // Shuffle the password
    return password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
  }
}

/**
 * Authentication state manager
 */
export class AuthStateManager {
  private static listeners: Set<(isAuthenticated: boolean) => void> = new Set();

  static subscribe(listener: (isAuthenticated: boolean) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  static notify(isAuthenticated: boolean) {
    this.listeners.forEach((listener) => listener(isAuthenticated));
  }
}

/**
 * Security utilities
 */
export class SecurityUtils {
  private static failedAttempts: Map<string, number> = new Map();
  private static lockoutTime: Map<string, number> = new Map();

  static recordFailedAttempt(identifier: string) {
    const attempts = (this.failedAttempts.get(identifier) || 0) + 1;
    this.failedAttempts.set(identifier, attempts);

    if (attempts >= AUTH_CONSTANTS.MAX_LOGIN_ATTEMPTS) {
      this.lockoutTime.set(
        identifier,
        Date.now() + AUTH_CONSTANTS.LOGIN_LOCKOUT_DURATION_MS,
      );
    }
  }

  static isLockedOut(identifier: string): boolean {
    const lockoutEnd = this.lockoutTime.get(identifier);
    if (!lockoutEnd) return false;

    if (Date.now() > lockoutEnd) {
      this.clearLockout(identifier);
      return false;
    }

    return true;
  }

  static getRemainingLockoutTime(identifier: string): number {
    const lockoutEnd = this.lockoutTime.get(identifier);
    if (!lockoutEnd) return 0;

    const remaining = Math.max(0, lockoutEnd - Date.now());
    return Math.ceil(remaining / 1000);
  }

  static clearLockout(identifier: string) {
    this.failedAttempts.delete(identifier);
    this.lockoutTime.delete(identifier);
  }

  static resetFailedAttempts(identifier: string) {
    this.failedAttempts.delete(identifier);
  }
}

/**
 * Token utilities
 */
export class TokenUtils {
  static isExpired(token: string): boolean {
    try {
      const payload = this.parseJWT(token);
      if (!payload.exp) return false;
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  }

  static parseJWT(token: string): any {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join(""),
      );
      return JSON.parse(jsonPayload);
    } catch {
      throw new Error("Invalid token");
    }
  }

  static getTimeUntilExpiry(token: string): number {
    try {
      const payload = this.parseJWT(token);
      if (!payload.exp) return Infinity;
      return Math.max(0, payload.exp * 1000 - Date.now());
    } catch {
      return 0;
    }
  }
}

/**
 * OAuth utilities
 */
export class OAuthUtils {
  static async handleOAuthCallback(url: string): Promise<{
    success: boolean;
    token?: string;
    error?: string;
  }> {
    try {
      // Parse OAuth callback URL
      const params = new URLSearchParams(url.split("?")[1]);
      const token = params.get("access_token");
      const error = params.get("error");

      if (error) {
        return { success: false, error };
      }

      if (token) {
        await SessionManager.saveSession(token);
        return { success: true, token };
      }

      return { success: false, error: "No token received" };
    } catch (error) {
      return { success: false, error: "Failed to process OAuth callback" };
    }
  }
}

/**
 * Device verification utilities
 */
export class DeviceVerification {
  private static readonly DEVICE_ID_KEY = "@hou2ed_device_id";
  private static readonly TRUSTED_DEVICES_KEY = "@hou2ed_trusted_devices";

  static async getDeviceId(): Promise<string> {
    try {
      let deviceId = await AsyncStorage.getItem(this.DEVICE_ID_KEY);
      if (!deviceId) {
        deviceId = this.generateDeviceId();
        await AsyncStorage.setItem(this.DEVICE_ID_KEY, deviceId);
      }
      return deviceId;
    } catch {
      return this.generateDeviceId();
    }
  }

  private static generateDeviceId(): string {
    return (
      "device_" + Date.now() + "_" + Math.random().toString(36).substring(2)
    );
  }

  static async isTrustedDevice(): Promise<boolean> {
    try {
      const deviceId = await this.getDeviceId();
      const trustedDevices = await AsyncStorage.getItem(
        this.TRUSTED_DEVICES_KEY,
      );
      if (!trustedDevices) return false;

      const devices = JSON.parse(trustedDevices);
      return devices.includes(deviceId);
    } catch {
      return false;
    }
  }

  static async trustDevice(): Promise<void> {
    try {
      const deviceId = await this.getDeviceId();
      const trustedDevices = await AsyncStorage.getItem(
        this.TRUSTED_DEVICES_KEY,
      );

      const devices = trustedDevices ? JSON.parse(trustedDevices) : [];
      if (!devices.includes(deviceId)) {
        devices.push(deviceId);
        await AsyncStorage.setItem(
          this.TRUSTED_DEVICES_KEY,
          JSON.stringify(devices),
        );
      }
    } catch (error) {
      console.error("Error trusting device:", error);
    }
  }
}

/**
 * Auth flow coordinator
 */
export class AuthFlowCoordinator {
  static async handleAuthSuccess(
    user: any,
    token: string,
    options?: {
      rememberMe?: boolean;
      trustDevice?: boolean;
    },
  ) {
    const { rememberMe = false, trustDevice = false } = options || {};

    // Save session
    const expiresIn = rememberMe
      ? 30 * 24 * 60 * 60
      : AUTH_CONSTANTS.SESSION_TIMEOUT_MS / 1000;
    await SessionManager.saveSession(token, undefined, expiresIn);

    // Trust device if requested
    if (trustDevice) {
      await DeviceVerification.trustDevice();
    }

    // Clear any lockouts
    SecurityUtils.clearLockout(user.email);

    // Notify listeners
    AuthStateManager.notify(true);
  }

  static async handleAuthFailure(identifier: string, error: string) {
    // Record failed attempt
    SecurityUtils.recordFailedAttempt(identifier);

    // Check if locked out
    if (SecurityUtils.isLockedOut(identifier)) {
      const remaining = SecurityUtils.getRemainingLockoutTime(identifier);
      Alert.alert(
        "Account Locked",
        `Too many failed attempts. Please try again in ${remaining} seconds.`,
      );
      return;
    }

    // Show error
    Alert.alert("Login Failed", error);
  }

  static async logout() {
    await SessionManager.clearSession();
    AuthStateManager.notify(false);
  }
}
