import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  ScrollView,
  AccessibilityInfo,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import AuthHeader from "../../components/Auth/AuthHeader";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { theme } from "../../theme";
import { RootStackNavigationProp } from "../../navigation/types";
import { supabase } from "../../lib/supabase";
import { AUTH_CONSTANTS, AUTH_MESSAGES } from "../../constants/auth.constants";

// Form validation schema
const resetPasswordSchema = z
  .object({
    email: z
      .string()
      .min(1, "Email is required")
      .email("Please enter a valid email"),
    code: z
      .string()
      .min(6, "Code must be 6 digits")
      .max(6, "Code must be 6 digits")
      .regex(/^\d{6}$/, "Code must be 6 digits"),
    newPassword: z
      .string()
      .min(
        AUTH_CONSTANTS.MIN_PASSWORD_LENGTH,
        AUTH_MESSAGES.VALIDATION.PASSWORD_TOO_SHORT,
      ),
    confirmPassword: z
      .string()
      .min(AUTH_CONSTANTS.MIN_PASSWORD_LENGTH, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const mounted = useRef(true);

  // Get email from navigation params if passed
  const emailFromParams = (route.params as any)?.email || "";

  // Form control
  const {
    control,
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors,
    setValue,
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: emailFromParams,
      code: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Cleanup
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Set email if passed from previous screen
  useEffect(() => {
    if (emailFromParams) {
      setValue("email", emailFromParams);
    }
  }, [emailFromParams, setValue]);

  // Handle password reset with OTP
  const onSubmit = async (data: ResetPasswordForm) => {
    setIsSubmitting(true);
    clearErrors();

    try {
      console.log("Attempting password reset with OTP");

      // First verify the OTP
      const { data: verifyData, error: verifyError } =
        await supabase.auth.verifyOtp({
          email: data.email,
          token: data.code,
          type: "recovery", // Use 'recovery' for password reset OTP
        });

      if (verifyError) {
        console.error("OTP verification error:", verifyError);
        if (verifyError.message.includes("expired")) {
          setError("code", {
            type: "manual",
            message: "This code has expired. Please request a new one.",
          });
        } else if (verifyError.message.includes("invalid")) {
          setError("code", {
            type: "manual",
            message: "Invalid code. Please check and try again.",
          });
        } else {
          setError("code", {
            type: "manual",
            message: "Verification failed. Please try again.",
          });
        }
        return;
      }

      // If OTP is verified, update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.newPassword,
      });

      if (updateError) {
        console.error("Password update error:", updateError);
        Alert.alert("Error", "Failed to update password. Please try again.");
        return;
      }

      if (!mounted.current) return;

      // Success!
      Alert.alert(
        "Success!",
        "Your password has been reset successfully. You can now log in with your new password.",
        [
          {
            text: "Go to Login",
            onPress: () => navigation.navigate("Login"),
          },
        ],
      );
    } catch (error) {
      console.error("Password reset error:", error);

      if (!mounted.current) return;

      Alert.alert(
        "Error",
        "Unable to reset password. Please check your code and try again.",
      );
    } finally {
      if (mounted.current) {
        setIsSubmitting(false);
      }
    }
  };

  // Resend OTP
  const handleResendCode = async () => {
    const email = (control as any)._formValues.email;
    if (!email) {
      Alert.alert("Error", "Please enter your email address first");
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) {
        console.error("Resend code error:", error);
        Alert.alert("Error", "Failed to send new code. Please try again.");
      } else {
        Alert.alert(
          "Code Sent!",
          "A new verification code has been sent to your email.",
        );
      }
    } catch (error) {
      console.error("Resend code error:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
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
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AuthHeader />

          <View style={styles.content}>
            {/* Icon */}
            <View style={styles.iconContainer}>
              <Ionicons
                name="shield-checkmark-outline"
                size={64}
                color="#D4AF37"
              />
            </View>

            {/* Title */}
            <Text style={styles.title}>Reset Your Password</Text>

            {/* Description */}
            <Text style={styles.description}>
              Enter the 6-digit code sent to your email and create a new
              password.
            </Text>

            {/* Email Input */}
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Email Address"
                  placeholder="Enter your email"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.email?.message}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoComplete="email"
                  editable={!isSubmitting}
                  accessibilityLabel="Email address input"
                />
              )}
            />

            {/* OTP Code Input */}
            <Controller
              control={control}
              name="code"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Verification Code"
                  placeholder="Enter 6-digit code"
                  value={value}
                  onChangeText={(text) => {
                    // Only allow digits and limit to 6
                    const cleaned = text.replace(/[^0-9]/g, "").slice(0, 6);
                    onChange(cleaned);
                  }}
                  onBlur={onBlur}
                  error={errors.code?.message}
                  keyboardType="numeric"
                  maxLength={6}
                  editable={!isSubmitting}
                  accessibilityLabel="Verification code input"
                  accessibilityHint="Enter the 6-digit code from your email"
                />
              )}
            />

            {/* Resend Code Button */}
            <TouchableOpacity
              onPress={handleResendCode}
              style={styles.resendButton}
              disabled={isSubmitting}
            >
              <Text style={styles.resendText}>
                Didn't receive a code? Resend
              </Text>
            </TouchableOpacity>

            {/* New Password Input */}
            <Controller
              control={control}
              name="newPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <Input
                    label="New Password"
                    placeholder="Enter new password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.newPassword?.message}
                    secureTextEntry={!showPassword}
                    textContentType="newPassword"
                    autoComplete="password-new"
                    editable={!isSubmitting}
                    accessibilityLabel="New password input"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                    accessibilityLabel={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                </View>
              )}
            />

            {/* Confirm Password Input */}
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <Input
                    label="Confirm New Password"
                    placeholder="Confirm new password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.confirmPassword?.message}
                    secureTextEntry={!showConfirmPassword}
                    textContentType="newPassword"
                    autoComplete="password-new"
                    editable={!isSubmitting}
                    accessibilityLabel="Confirm password input"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    accessibilityLabel={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                  >
                    <Ionicons
                      name={
                        showConfirmPassword ? "eye-off-outline" : "eye-outline"
                      }
                      size={20}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                </View>
              )}
            />

            {/* Password Requirements */}
            <View style={styles.requirementsContainer}>
              <Text style={styles.requirementsTitle}>
                Password must contain:
              </Text>
              <Text style={styles.requirementItem}>
                • At least {AUTH_CONSTANTS.MIN_PASSWORD_LENGTH} characters
              </Text>
            </View>

            {/* Submit Button */}
            <Button
              variant="primary"
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting}
              disabled={isSubmitting}
              style={styles.submitButton}
              accessibilityLabel="Reset password button"
            >
              {isSubmitting ? "Resetting..." : "Reset Password"}
            </Button>

            {/* Back to Login */}
            <TouchableOpacity
              onPress={() => navigation.navigate("Login")}
              style={styles.backButton}
              disabled={isSubmitting}
              accessibilityRole="link"
              accessibilityLabel="Back to login"
            >
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              <Text style={styles.backText}>Back to Login</Text>
            </TouchableOpacity>
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
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    justifyContent: "center",
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    color: "#D4AF37",
    textAlign: "center",
    marginBottom: theme.spacing.sm,
  },
  description: {
    fontSize: theme.typography.fontSize.md,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
  },
  resendButton: {
    alignItems: "center",
    marginTop: -theme.spacing.sm,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.sm,
  },
  resendText: {
    fontSize: theme.typography.fontSize.sm,
    color: "#D4AF37",
    textDecorationLine: "underline",
  },
  eyeButton: {
    position: "absolute",
    right: theme.spacing.md,
    top: 38,
    padding: theme.spacing.sm,
  },
  requirementsContainer: {
    backgroundColor: "rgba(212, 175, 55, 0.1)",
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginVertical: theme.spacing.md,
  },
  requirementsTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: "#D4AF37",
    marginBottom: theme.spacing.xs,
  },
  requirementItem: {
    fontSize: theme.typography.fontSize.xs,
    color: "#9CA3AF",
    lineHeight: 18,
  },
  submitButton: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.md,
  },
  backText: {
    fontSize: theme.typography.fontSize.md,
    color: "#FFFFFF",
  },
});
