import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  AccessibilityInfo,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import AuthHeader from "../../components/Auth/AuthHeader";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { theme } from "../../theme";
import { useAuthStore } from "../../state/useAuthStore";
import { RootStackNavigationProp } from "../../navigation/types";
import { loginUser } from "../../services/auth.service";
import { classifyAuthError, AUTH_ERROR_CODES } from "../../utils/auth-errors";
import {
  sanitizeEmail,
  sanitizeUsername,
  sanitizePassword,
} from "../../utils/sanitization";
import { useRateLimit } from "../../hooks/useRateLimit";
import { AUTH_MESSAGES, AUTH_CONSTANTS } from "../../constants/auth.constants";

export default function Login() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const setUser = useAuthStore((state) => state.setUser);

  // Rate limiting
  const {
    isLocked,
    remainingAttempts,
    timeUntilUnlock,
    incrementAttempts,
    resetAttempts,
    checkRateLimit,
  } = useRateLimit("login");

  // Form state
  const [formData, setFormData] = useState({
    emailOrUsername: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);

  // Refs for cleanup
  const mounted = useRef(true);
  const loadingTimeout = useRef<NodeJS.Timeout | undefined>(undefined);

  // Cleanup on unmount
  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
      if (loadingTimeout.current) {
        clearTimeout(loadingTimeout.current);
      }
    };
  }, []);

  // Announce errors to screen readers
  useEffect(() => {
    const errorMessages = Object.values(errors).join(". ");
    if (errorMessages) {
      AccessibilityInfo.announceForAccessibility(errorMessages);
    }
  }, [errors]);

  // Check if form is valid
  useEffect(() => {
    const isValid =
      formData.emailOrUsername.trim().length >= 3 &&
      formData.password.trim().length >= AUTH_CONSTANTS.MIN_PASSWORD_LENGTH &&
      !isLocked;
    setIsFormValid(isValid);
  }, [formData, isLocked]);

  // Sanitize and update field
  const handleFieldChange = useCallback(
    (field: string, value: string) => {
      // Apply sanitization based on field
      let sanitizedValue = value;
      if (field === "emailOrUsername") {
        // Check if it looks like an email
        if (value.includes("@")) {
          sanitizedValue = sanitizeEmail(value) || value;
        } else {
          sanitizedValue = sanitizeUsername(value);
        }
      } else if (field === "password") {
        sanitizedValue = sanitizePassword(value);
      }

      setFormData((prev) => ({ ...prev, [field]: sanitizedValue }));

      // Clear error for this field when user starts typing
      if (errors[field]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    },
    [errors],
  );

  // Validate form
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.emailOrUsername.trim()) {
      newErrors.emailOrUsername = AUTH_MESSAGES.VALIDATION.EMAIL_REQUIRED;
    } else if (formData.emailOrUsername.length < 3) {
      newErrors.emailOrUsername = "Must be at least 3 characters";
    }

    if (!formData.password.trim()) {
      newErrors.password = AUTH_MESSAGES.VALIDATION.PASSWORD_REQUIRED;
    } else if (formData.password.length < AUTH_CONSTANTS.MIN_PASSWORD_LENGTH) {
      newErrors.password = AUTH_MESSAGES.VALIDATION.PASSWORD_TOO_SHORT;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle login with all production features
  const handleLogin = useCallback(async () => {
    // Check rate limiting
    if (!checkRateLimit()) {
      Alert.alert(
        "Too Many Attempts",
        `Please wait ${timeUntilUnlock} seconds before trying again.`,
      );
      return;
    }

    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    // Set a timeout for the login attempt
    loadingTimeout.current = setTimeout(() => {
      if (mounted.current) {
        setIsLoading(false);
        Alert.alert("Error", AUTH_MESSAGES.ERROR.NETWORK_ERROR);
      }
    }, 30000); // 30 second timeout

    try {
      const result = await loginUser({
        emailOrUsername: formData.emailOrUsername,
        password: formData.password,
      });

      // Clear timeout on successful response
      if (loadingTimeout.current) {
        clearTimeout(loadingTimeout.current);
      }

      if (!mounted.current) return; // Component unmounted

      if (result.success && result.user) {
        resetAttempts(); // Reset rate limiting on success
        setUser(result.user);

        // Navigate to main app
        navigation.reset({
          index: 0,
          routes: [{ name: "Tabs" }],
        });
      } else {
        incrementAttempts(); // Increment failed attempts

        const errorCode = result.errorCode || AUTH_ERROR_CODES.UNKNOWN;

        switch (errorCode) {
          case AUTH_ERROR_CODES.INVALID_CREDENTIALS:
          case AUTH_ERROR_CODES.USER_NOT_FOUND:
            setErrors({
              password:
                remainingAttempts > 1
                  ? `Invalid credentials. ${remainingAttempts - 1} attempts remaining.`
                  : AUTH_MESSAGES.ERROR.INVALID_CREDENTIALS,
            });
            break;

          case AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED:
            Alert.alert(
              "Verification Required",
              AUTH_MESSAGES.ERROR.EMAIL_NOT_VERIFIED,
            );
            break;

          default:
            Alert.alert(
              "Error",
              result.error || AUTH_MESSAGES.ERROR.LOGIN_FAILED,
            );
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      incrementAttempts();

      if (!mounted.current) return;

      Alert.alert("Error", AUTH_MESSAGES.ERROR.LOGIN_FAILED);
    } finally {
      if (mounted.current) {
        setIsLoading(false);
      }
      if (loadingTimeout.current) {
        clearTimeout(loadingTimeout.current);
      }
    }
  }, [
    checkRateLimit,
    validateForm,
    formData,
    incrementAttempts,
    resetAttempts,
    remainingAttempts,
    timeUntilUnlock,
    setUser,
    navigation,
  ]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Reusable Auth Header */}
          <AuthHeader />

          {/* Tab Selector */}
          <View style={styles.tabContainer}>
            <View
              style={[styles.tab, styles.activeTab]}
              accessibilityRole="tab"
              accessibilityState={{ selected: true }}
              accessibilityLabel="Login tab, currently selected"
            >
              <Text style={styles.activeTabText}>Log In</Text>
            </View>
            <TouchableOpacity
              style={styles.tab}
              onPress={() => navigation.navigate("SignUp")}
              accessibilityRole="tab"
              accessibilityState={{ selected: false }}
              accessibilityLabel="Sign up tab"
              accessibilityHint="Double tap to switch to sign up"
            >
              <Text style={styles.inactiveTabText}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          {/* Rate limit warning */}
          {isLocked && (
            <View style={styles.rateLimitWarning} accessibilityRole="alert">
              <Ionicons
                name="lock-closed"
                size={20}
                color={"#EF4444"}
              />
              <Text style={styles.rateLimitText}>
                Too many attempts. Try again in {timeUntilUnlock} seconds.
              </Text>
            </View>
          )}

          {/* Login Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Input
                label="Email or Username"
                value={formData.emailOrUsername}
                onChangeText={(text) =>
                  handleFieldChange("emailOrUsername", text)
                }
                placeholder="Enter email or username"
                error={errors.emailOrUsername}
                autoCapitalize="none"
                keyboardType="default"
                autoCorrect={false}
                editable={!isLoading && !isLocked}
                accessibilityLabel="Email or username input"
                accessibilityHint="Enter your email address or username"
                testID="login-email-input"
              />
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.passwordInputWrapper}>
                <Input
                  label="Password"
                  value={formData.password}
                  onChangeText={(text) => handleFieldChange("password", text)}
                  placeholder="Enter your password"
                  error={errors.password}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading && !isLocked}
                  accessibilityLabel="Password input"
                  accessibilityHint="Enter your password"
                  testID="login-password-input"
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(!showPassword)}
                  accessibilityLabel={
                    showPassword ? "Hide password" : "Show password"
                  }
                  accessibilityRole="button"
                  disabled={isLoading}
                  testID="password-toggle"
                >
                  <Ionicons
                    name={showPassword ? "eye-off" : "eye"}
                    size={20}
                    color={"#FFFFFF"}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password Link */}
            <TouchableOpacity
              onPress={() => navigation.navigate("ForgotPassword")}
              style={styles.forgotPasswordButton}
              disabled={isLoading}
              accessibilityRole="link"
              accessibilityLabel="Forgot password"
              accessibilityHint="Double tap to reset your password"
            >
              <Text style={styles.forgotPassword}>Forgot password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <Button
              variant="primary"
              onPress={handleLogin}
              loading={isLoading}
              disabled={!isFormValid || isLoading || isLocked}
              style={styles.loginButton}
              accessibilityLabel="Log in button"
              accessibilityHint={
                isLocked
                  ? `Locked for ${timeUntilUnlock} seconds`
                  : isFormValid
                    ? "Double tap to log in"
                    : "Fill in all fields to enable"
              }
              testID="login-button"
            >
              {isLoading ? (
                <ActivityIndicator color={"#000000"} />
              ) : (
                "Log In"
              )}
            </Button>

            {/* Sign Up Link */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("SignUp")}
                disabled={isLoading}
                accessibilityRole="link"
                accessibilityLabel="Sign up"
                accessibilityHint="Double tap to create a new account"
              >
                <Text style={styles.footerLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: theme.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#D4AF37",
  },
  activeTabText: {
    color: "#D4AF37",
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  inactiveTabText: {
    color: "#FFFFFF",
    fontSize: theme.typography.fontSize.lg,
  },
  rateLimitWarning: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${"#EF4444"}20`,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
  },
  rateLimitText: {
    color: "#EF4444",
    fontSize: theme.typography.fontSize.sm,
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: theme.spacing.lg,
  },
  passwordInputWrapper: {
    position: "relative",
  },
  passwordToggle: {
    position: "absolute",
    right: theme.spacing.md,
    top: 38,
    padding: theme.spacing.sm,
  },
  forgotPasswordButton: {
    alignSelf: "flex-end",
    marginBottom: theme.spacing.xl,
  },
  forgotPassword: {
    color: "#FFFFFF",
    fontSize: theme.typography.fontSize.sm,
  },
  loginButton: {
    marginBottom: theme.spacing.xl,
    minHeight: 48, // Accessibility minimum touch target
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    color: "#FFFFFF",
    fontSize: theme.typography.fontSize.md,
  },
  footerLink: {
    color: "#FFFFFF",
    fontSize: theme.typography.fontSize.md,
    textDecorationLine: "underline",
  },
});
