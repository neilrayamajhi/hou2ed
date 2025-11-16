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
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import AuthHeader from "../../components/Auth/AuthHeader";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { theme } from "../../theme";
import { useAuthStore } from "../../state/useAuthStore";
import VerificationModal from "../../components/ui/VerificationModal";
import { RootStackNavigationProp } from "../../navigation/types";
import {
  signUpUser,
  resendVerificationCode,
} from "../../services/auth.service";
import { supabase } from "../../lib/supabase";
import { AUTH_ERROR_CODES } from "../../utils/auth-errors";
import { useRateLimit } from "../../hooks/useRateLimit";
import {
  AUTH_MESSAGES,
  AUTH_CONSTANTS,
  AUTH_REGEX,
} from "../../constants/auth.constants";
import { PasswordStrength } from "../../utils/auth-helpers";

// Zod schema for form validation
const signUpSchema = z
  .object({
    fullName: z
      .string()
      .min(2, "Full name must be at least 2 characters")
      .max(100, "Full name must be less than 100 characters")
      .regex(
        /^[a-zA-Z\s'-]+$/,
        "Full name can only contain letters, spaces, hyphens, and apostrophes",
      ),
    username: z
      .string()
      .min(
        AUTH_CONSTANTS.MIN_USERNAME_LENGTH,
        "Username must be at least 3 characters",
      )
      .max(
        AUTH_CONSTANTS.MAX_USERNAME_LENGTH,
        "Username must be less than 30 characters",
      )
      .regex(
        AUTH_REGEX.USERNAME,
        "Username can only contain letters, numbers, and underscores",
      ),
    email: z.string().email("Please enter a valid email address").toLowerCase(),
    password: z
      .string()
      .min(
        AUTH_CONSTANTS.MIN_PASSWORD_LENGTH,
        AUTH_MESSAGES.VALIDATION.PASSWORD_TOO_SHORT,
      )
      .max(
        AUTH_CONSTANTS.MAX_PASSWORD_LENGTH,
        AUTH_MESSAGES.VALIDATION.PASSWORD_TOO_LONG,
      )
      .regex(
        AUTH_REGEX.STRONG_PASSWORD,
        AUTH_MESSAGES.VALIDATION.PASSWORD_WEAK,
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: AUTH_MESSAGES.VALIDATION.PASSWORDS_DONT_MATCH,
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof signUpSchema>;

export default function SignUp() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute();
  const setUser = useAuthStore((state) => state.setUser);
  const [selectedRole, setSelectedRole] = useState<"seeker" | "provider">(
    (route.params as any)?.role ||
    useAuthStore((state) => state.selectedRole) ||
    "seeker"
  );

  // Rate limiting
  const {
    isLocked,
    remainingAttempts,
    timeUntilUnlock,
    incrementAttempts,
    resetAttempts,
    checkRateLimit,
  } = useRateLimit("signup");

  // React Hook Form
  const {
    control,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
    watch,
    trigger,
  } = useForm<FormData>({
    resolver: zodResolver(signUpSchema),
    mode: "onChange",
    defaultValues: {
      fullName: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Watch password for strength indicator
  const watchPassword = watch("password");

  // State
  const [showVerification, setShowVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [passwordStrength, setPasswordStrength] = useState<ReturnType<
    typeof PasswordStrength.calculate
  > | null>(null);

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

  // Calculate password strength
  useEffect(() => {
    if (watchPassword) {
      const strength = PasswordStrength.calculate(watchPassword);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength(null);
    }
  }, [watchPassword]);

  // Announce errors to screen readers
  useEffect(() => {
    const errorMessages = Object.values(errors)
      .map((e) => e?.message)
      .filter(Boolean)
      .join(". ");
    if (errorMessages) {
      AccessibilityInfo.announceForAccessibility(errorMessages);
    }
  }, [errors]);

  // Handle form submission
  const onSubmit = useCallback(
    async (data: FormData) => {
      // Check rate limiting
      if (!checkRateLimit()) {
        Alert.alert(
          "Too Many Attempts",
          `Please wait ${timeUntilUnlock} seconds before trying again.`,
        );
        return;
      }

      // Removed timeout - it was causing abort errors
      // Let Supabase handle its own timeouts

      try {
        console.log("=== SIGNUP ATTEMPT ===");
        console.log("Email:", data.email);
        console.log("Username:", data.username);
        console.log("Selected Role:", selectedRole);
        console.log("Is Provider:", selectedRole === "provider");

        const result = await signUpUser({
          fullName: data.fullName,
          username: data.username,
          email: data.email,
          password: data.password,
          role: selectedRole,
        });

        // Timeout removed - no need to clear

        if (!mounted.current) return;

        if (result.success) {
          console.log("✅ Signup successful!");
          resetAttempts();

          // Check if user needs verification or is auto-confirmed
          if (result.needsVerification === false) {
            console.log("User is auto-confirmed! Logging in automatically...");

            // Auto-login the user since they're already verified
            try {
              const { error } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
              });

              if (!error) {
                console.log("✅ Auto-login successful!");
                // User will be redirected automatically by AuthProvider
                return;
              } else {
                console.log("Auto-login failed, user can login manually:", error);
                Alert.alert(
                  "Account Created!",
                  "Your account has been created successfully. You can now login.",
                  [{ text: "OK", onPress: () => navigation.navigate("Login") }]
                );
              }
            } catch (loginError) {
              console.log("Auto-login error:", loginError);
              Alert.alert(
                "Account Created!",
                "Your account has been created successfully. You can now login.",
                [{ text: "OK", onPress: () => navigation.navigate("Login") }]
              );
            }
          } else {
            // Show verification modal (old flow - only if email verification is needed)
            console.log("Setting verification email to:", data.email);
            console.log("Showing verification modal");
            setVerificationEmail(data.email);
            setShowVerification(true);
          }
        } else {
          console.error("❌ Signup failed:", result.error);
          incrementAttempts();

          const errorCode = result.errorCode || AUTH_ERROR_CODES.UNKNOWN;

          switch (errorCode) {
            case AUTH_ERROR_CODES.EMAIL_EXISTS:
              Alert.alert(
                "Email Already Registered",
                remainingAttempts > 1
                  ? `This email is already registered. ${remainingAttempts - 1} attempts remaining.`
                  : "This email is already registered. Please use a different email or log in.",
              );
              break;

            case AUTH_ERROR_CODES.USERNAME_EXISTS:
              Alert.alert(
                "Username Taken",
                "This username is already taken. Please choose a different one.",
              );
              break;

            case AUTH_ERROR_CODES.WEAK_PASSWORD:
              Alert.alert(
                "Weak Password",
                AUTH_MESSAGES.VALIDATION.PASSWORD_WEAK,
              );
              break;

            case "NETWORK_ERROR":
              Alert.alert(
                "Connection Error",
                "Unable to connect to the server. Please check your internet connection and try again.",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Retry", onPress: () => handleSubmit(onSubmit)() },
                ],
              );
              break;

            default:
              Alert.alert(
                "Error",
                result.error || AUTH_MESSAGES.ERROR.SIGNUP_FAILED,
              );
          }
        }
      } catch (error: any) {
        console.error("Sign up error:", error);
        incrementAttempts();

        if (!mounted.current) return;

        // Check for network errors
        if (
          error?.message?.includes("fetch") ||
          error?.message?.includes("Network request failed")
        ) {
          Alert.alert(
            "Connection Error",
            "Unable to connect to the server. Please check your internet connection.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Retry", onPress: () => handleSubmit(onSubmit)() },
            ],
          );
        } else {
          Alert.alert("Error", AUTH_MESSAGES.ERROR.SIGNUP_FAILED);
        }
      } finally {
        // Timeout removed - no cleanup needed
      }
    },
    [
      checkRateLimit,
      timeUntilUnlock,
      selectedRole,
      incrementAttempts,
      resetAttempts,
      remainingAttempts,
    ],
  );

  // Handle resend code (defined before handleVerificationComplete)
  const handleResendCode = useCallback(async () => {
    try {
      const result = await resendVerificationCode(verificationEmail);
      if (result.success) {
        Alert.alert(
          "Success",
          "Verification code sent successfully. Check your email inbox and spam folder.",
        );
      } else {
        Alert.alert("Error", result.error || "Failed to resend code");
      }
    } catch (error) {
      console.error("Resend error:", error);
      Alert.alert("Error", "Failed to resend verification code");
    }
  }, [verificationEmail]);

  // Handle verification
  const handleVerificationComplete = useCallback(
    async (code: string) => {
      try {
        const { verifyOtp } = await import("../../services/auth.service");
        const result = await verifyOtp(verificationEmail, code);

        if (!mounted.current) return;

        if (result.success && result.user) {
          setUser(result.user);
          setShowVerification(false);

          Alert.alert("Success", AUTH_MESSAGES.SUCCESS.VERIFICATION, [
            {
              text: "Continue",
              onPress: () => {
                // All users go to Tabs - TabNavigator shows correct tabs based on role
                navigation.reset({
                  index: 0,
                  routes: [{ name: "Tabs" }],
                });
              },
            },
          ]);
        } else {
          Alert.alert(
            "Verification Failed",
            result.error || AUTH_MESSAGES.ERROR.UNKNOWN,
            [
              { text: "Try Again", style: "cancel" },
              {
                text: "Resend Code",
                onPress: handleResendCode,
              },
            ],
          );
        }
      } catch (error) {
        console.error("Verification error:", error);
        if (mounted.current) {
          Alert.alert(
            "Error",
            "Failed to verify code. Please check your email and try again.",
            [
              { text: "OK", style: "cancel" },
              {
                text: "Resend Code",
                onPress: handleResendCode,
              },
            ],
          );
        }
      }
    },
    [verificationEmail, setUser, navigation, handleResendCode],
  );

  // Get password strength color
  const getPasswordStrengthColor = () => {
    if (!passwordStrength) return "#374151";
    switch (passwordStrength.strength) {
      case "weak":
        return "#EF4444";
      case "fair":
        return "#F59E0B";
      case "good":
        return "#21C55D";
      case "strong":
        return "#D4AF37";
      default:
        return "#374151";
    }
  };

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
            <TouchableOpacity
              style={styles.tab}
              onPress={() => navigation.navigate("Login")}
              accessibilityRole="tab"
              accessibilityState={{ selected: false }}
              accessibilityLabel="Login tab"
              accessibilityHint="Double tap to switch to login"
            >
              <Text style={styles.inactiveTabText}>Log In</Text>
            </TouchableOpacity>
            <View
              style={[styles.tab, styles.activeTab]}
              accessibilityRole="tab"
              accessibilityState={{ selected: true }}
              accessibilityLabel="Sign up tab, currently selected"
            >
              <Text style={styles.activeTabText}>Sign Up</Text>
            </View>
          </View>

          {/* Role Selection */}
          <View style={styles.roleContainer}>
            <Text style={styles.roleTitle}>I want to:</Text>
            <View style={styles.roleButtonsContainer}>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  selectedRole === "seeker" && styles.roleButtonActive,
                ]}
                onPress={() => setSelectedRole("seeker")}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityState={{ selected: selectedRole === "seeker" }}
                accessibilityLabel="Seeker role"
                accessibilityHint="Select to sign up as someone looking for housing"
              >
                <Ionicons
                  name="home-outline"
                  size={24}
                  color={selectedRole === "seeker" ? "#000000" : "#FFFFFF"}
                />
                <Text
                  style={[
                    styles.roleButtonText,
                    selectedRole === "seeker" && styles.roleButtonTextActive,
                  ]}
                >
                  Find Housing
                </Text>
                <Text
                  style={[
                    styles.roleButtonSubtext,
                    selectedRole === "seeker" && styles.roleButtonSubtextActive,
                  ]}
                >
                  (Seeker)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleButton,
                  selectedRole === "provider" && styles.roleButtonActive,
                ]}
                onPress={() => setSelectedRole("provider")}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityState={{ selected: selectedRole === "provider" }}
                accessibilityLabel="Provider role"
                accessibilityHint="Select to sign up as a housing provider"
              >
                <Ionicons
                  name="business-outline"
                  size={24}
                  color={selectedRole === "provider" ? "#000000" : "#FFFFFF"}
                />
                <Text
                  style={[
                    styles.roleButtonText,
                    selectedRole === "provider" && styles.roleButtonTextActive,
                  ]}
                >
                  Offer Housing
                </Text>
                <Text
                  style={[
                    styles.roleButtonSubtext,
                    selectedRole === "provider" && styles.roleButtonSubtextActive,
                  ]}
                >
                  (Provider)
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Rate limit warning */}
          {isLocked && (
            <View style={styles.rateLimitWarning} accessibilityRole="alert">
              <Ionicons name="lock-closed" size={20} color={"#EF4444"} />
              <Text style={styles.rateLimitText}>
                Too many attempts. Try again in {timeUntilUnlock} seconds.
              </Text>
            </View>
          )}

          {/* Sign Up Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Controller
                control={control}
                name="fullName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Full Name"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Enter your full name"
                    error={errors.fullName?.message}
                    autoCapitalize="words"
                    editable={!isSubmitting && !isLocked}
                    accessibilityLabel="Full name input"
                    accessibilityHint="Enter your full name"
                    testID="signup-fullname-input"
                  />
                )}
              />
            </View>

            <View style={styles.inputContainer}>
              <Controller
                control={control}
                name="username"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Username"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Choose a username"
                    error={errors.username?.message}
                    autoCapitalize="none"
                    textContentType="username"
                    helpText="Letters, numbers, and underscores only"
                    editable={!isSubmitting && !isLocked}
                    accessibilityLabel="Username input"
                    accessibilityHint="Choose a unique username"
                    testID="signup-username-input"
                  />
                )}
              />
            </View>

            <View style={styles.inputContainer}>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Email"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Enter your email"
                    error={errors.email?.message}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    autoCorrect={false}
                    editable={!isSubmitting && !isLocked}
                    accessibilityLabel="Email input"
                    accessibilityHint="Enter your email address"
                    testID="signup-email-input"
                  />
                )}
              />
            </View>

            <View style={styles.inputContainer}>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Password"
                    value={value}
                    onChangeText={(text) => {
                      onChange(text);
                      // Trigger confirm password validation when password changes
                      if (watch("confirmPassword")) {
                        trigger("confirmPassword");
                      }
                    }}
                    onBlur={onBlur}
                    placeholder="Create a password"
                    error={errors.password?.message}
                    secureTextEntry={true}
                    showPasswordToggle={true}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="newPassword"
                    helpText="At least 8 characters, with uppercase, lowercase, and numbers"
                    editable={!isSubmitting && !isLocked}
                    accessibilityLabel="Password input"
                    accessibilityHint="Create a strong password"
                    testID="signup-password-input"
                  />
                )}
              />

              {/* Password Strength Indicator */}
              {passwordStrength && (
                <View style={styles.passwordStrengthContainer}>
                  <View style={styles.strengthBarContainer}>
                    <View
                      style={[
                        styles.strengthBar,
                        {
                          width: `${passwordStrength.score}%`,
                          backgroundColor: getPasswordStrengthColor(),
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.strengthText,
                      { color: getPasswordStrengthColor() },
                    ]}
                  >
                    Password strength: {passwordStrength.strength}
                  </Text>
                  {passwordStrength.suggestions.length > 0 && (
                    <View style={styles.suggestionsContainer}>
                      {passwordStrength.suggestions.map((suggestion, index) => (
                        <Text key={index} style={styles.suggestionText}>
                          • {suggestion}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Confirm Password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Confirm your password"
                    error={errors.confirmPassword?.message}
                    secureTextEntry={true}
                    showPasswordToggle={true}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isSubmitting && !isLocked}
                    accessibilityLabel="Confirm password input"
                    accessibilityHint="Re-enter your password"
                    testID="signup-confirm-password-input"
                  />
                )}
              />
            </View>

            {/* Sign Up Button */}
            <Button
              variant="primary"
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting}
              disabled={!isValid || isSubmitting || isLocked}
              style={styles.signUpButton}
              accessibilityLabel="Sign up button"
              accessibilityHint={
                isLocked
                  ? `Locked for ${timeUntilUnlock} seconds`
                  : isValid
                    ? "Double tap to sign up"
                    : "Fill in all fields correctly to enable"
              }
              testID="signup-button"
            >
              {isSubmitting ? (
                <ActivityIndicator color={"#000000"} />
              ) : (
                "Sign Up"
              )}
            </Button>

            {/* Log In Link */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("Login")}
                disabled={isSubmitting}
                accessibilityRole="link"
                accessibilityLabel="Log in"
                accessibilityHint="Double tap to switch to login"
              >
                <Text style={styles.footerLink}>Log In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Verification Modal */}
      {showVerification && (
        <VerificationModal
          visible={showVerification}
          email={verificationEmail}
          onComplete={handleVerificationComplete}
          onResend={handleResendCode}
          onBack={() => {
            // Close verification modal and return to signup form
            setShowVerification(false);
            setVerificationEmail("");
            // Reset the form so user can try with different email if needed
            reset();
          }}
        />
      )}
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
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: theme.spacing.lg,
  },
  passwordStrengthContainer: {
    marginTop: theme.spacing.sm,
  },
  strengthBarContainer: {
    height: 4,
    backgroundColor: "#1F2937",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: theme.spacing.xs,
  },
  strengthBar: {
    height: "100%",
    borderRadius: 2,
  },
  strengthText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    marginBottom: theme.spacing.xs,
  },
  suggestionsContainer: {
    marginTop: theme.spacing.xs,
  },
  suggestionText: {
    fontSize: theme.typography.fontSize.xs,
    color: "#4B5563",
    marginBottom: 2,
  },
  signUpButton: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    minHeight: 48,
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
  roleContainer: {
    marginBottom: theme.spacing.xl,
  },
  roleTitle: {
    color: "#FFFFFF",
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    marginBottom: theme.spacing.md,
    textAlign: "center",
  },
  roleButtonsContainer: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  roleButton: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 100,
  },
  roleButtonActive: {
    backgroundColor: "#D4AF37",
    borderColor: "#D4AF37",
  },
  roleButtonText: {
    color: "#FFFFFF",
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    marginTop: theme.spacing.sm,
    textAlign: "center",
  },
  roleButtonTextActive: {
    color: "#000000",
  },
  roleButtonSubtext: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: theme.typography.fontSize.sm,
    marginTop: theme.spacing.xs,
  },
  roleButtonSubtextActive: {
    color: "rgba(0, 0, 0, 0.7)",
  },
});
