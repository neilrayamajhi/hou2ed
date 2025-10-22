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
  AccessibilityInfo,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import AuthHeader from "../../components/Auth/AuthHeader";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { theme } from "../../theme";
import { useRateLimit } from "../../hooks/useRateLimit";
import { RootStackNavigationProp } from "../../navigation/types";
import { supabase } from "../../lib/supabase";
import { sanitizeEmail } from "../../utils/sanitization";
import { resilientRequest } from "../../utils/network";
import { AUTH_CONSTANTS, AUTH_MESSAGES } from "../../constants/auth.constants";
import { AuthError } from "../../types/events";

// Form validation schema
const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email")
    .toLowerCase(),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const mounted = useRef(true);

  // Rate limiting
  const { checkRateLimit, isLocked, timeUntilUnlock } = useRateLimit(
    "forgot-password",
    5,
    900000,
  );

  // Form control
  const {
    control,
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  // Cleanup
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Announce success to screen readers
  useEffect(() => {
    if (successMessage) {
      AccessibilityInfo.announceForAccessibility(successMessage);
    }
  }, [successMessage]);

  // Handle password reset
  const onSubmit = async (data: ForgotPasswordForm) => {
    if (!checkRateLimit()) {
      const minutes = Math.ceil(timeUntilUnlock / 60000);
      Alert.alert(
        "Too Many Attempts",
        `Please wait ${minutes} minute${minutes > 1 ? "s" : ""} before trying again.`,
      );
      return;
    }

    setIsSubmitting(true);
    clearErrors();
    setSuccessMessage("");

    try {
      // Sanitize email
      const sanitizedEmail = sanitizeEmail(data.email);

      if (!sanitizedEmail) {
        throw new Error("Invalid email format");
      }

      // Send reset email with retry logic
      await resilientRequest(
        async () => {
          const { error } = await supabase.auth.resetPasswordForEmail(
            sanitizedEmail,
            {
              redirectTo: `${process.env.EXPO_PUBLIC_APP_URL || "exp://localhost:8081"}/reset-password`,
            },
          );

          if (error) throw error;
        },
        {
          maxRetries: 2,
          onRetry: (attempt) => {
            console.log(`Retrying password reset... Attempt ${attempt}`);
          },
        },
      );

      if (!mounted.current) return;

      // Show success message
      setSuccessMessage(
        "If an account exists with this email, you'll receive a password reset link shortly.",
      );

      // Navigate back after delay
      setTimeout(() => {
        if (mounted.current) {
          Alert.alert(
            "Email Sent",
            "Check your inbox for the password reset link.",
            [
              {
                text: "Back to Login",
                onPress: () => navigation.navigate("Login"),
              },
            ],
          );
        }
      }, 2000);
    } catch (error) {
      const authError = error as AuthError;
      console.error("Password reset error:", authError);

      if (!mounted.current) return;

      // Generic error message for security
      setError("email", {
        type: "manual",
        message: "Unable to send reset email. Please try again.",
      });
    } finally {
      if (mounted.current) {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <AuthHeader />

        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={64}
              color={"#D4AF37"}
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>Forgot Password?</Text>

          {/* Description */}
          <Text style={styles.description}>
            Enter your email address and we'll send you a link to reset your
            password.
          </Text>

          {/* Success Message */}
          {successMessage ? (
            <View style={styles.successContainer} accessibilityRole="alert">
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={"#21C55D"}
              />
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          ) : null}

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
                editable={!isSubmitting && !isLocked}
                accessibilityLabel="Email address input"
                accessibilityHint="Enter the email associated with your account"
                testID="email-input"
              />
            )}
          />

          {/* Rate limit warning */}
          {isLocked && (
            <Text style={styles.errorText} accessibilityRole="alert">
              Too many attempts. Please wait{" "}
              {Math.ceil(timeUntilUnlock / 60000)} minute(s).
            </Text>
          )}

          {/* Submit Button */}
          <Button
            variant="primary"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            disabled={isSubmitting || isLocked || !!successMessage}
            style={styles.submitButton}
            accessibilityLabel="Send reset link button"
            accessibilityHint="Double tap to send password reset email"
            testID="submit-button"
          >
            {isSubmitting ? "Sending..." : "Send Reset Link"}
          </Button>

          {/* Back to Login */}
          <TouchableOpacity
            onPress={() => navigation.navigate("Login")}
            style={styles.backButton}
            disabled={isSubmitting}
            accessibilityRole="link"
            accessibilityLabel="Back to login"
            accessibilityHint="Double tap to go back to login screen"
          >
            <Ionicons name="arrow-back" size={20} color={"#FFFFFF"} />
            <Text style={styles.backText}>Back to Login</Text>
          </TouchableOpacity>

          {/* Security Note */}
          <View style={styles.noteContainer}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={"#4B5563"}
            />
            <Text style={styles.noteText}>
              For security reasons, we'll send a reset link to this email only
              if an account exists.
            </Text>
          </View>
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
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
  successContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${"#21C55D"}15`,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  successText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: "#21C55D",
    lineHeight: 20,
  },
  errorText: {
    fontSize: theme.typography.fontSize.sm,
    color: "#EF4444",
    textAlign: "center",
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
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
  noteContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.sm,
  },
  noteText: {
    flex: 1,
    fontSize: theme.typography.fontSize.xs,
    color: "#4B5563",
    lineHeight: 16,
  },
});
