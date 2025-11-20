import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  AccessibilityInfo,
  Animated,
  Vibration,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import AuthHeader from "../../components/Auth/AuthHeader";
import Button from "../../components/ui/Button";
import { theme } from "../../theme";
import { useAuthStore } from "../../state/useAuthStore";
import {
  RootStackNavigationProp,
  RootStackRouteProp,
} from "../../navigation/types";
import { verifyOtp, resendVerificationCode } from "../../services/auth.service";
import { AUTH_MESSAGES } from "../../constants/auth.constants";
import { KeyPressEvent, AuthError } from "../../types/events";
import {
  isValidOTPDigit,
  formatTimerDisplay,
  createEmptyOTPArray,
  parsePastedOTP,
  findNextEmptyIndex,
  isCompleteOTPCode,
} from "../../utils/otp";

const RESEND_TIMER_SECONDS = 30;
const CODE_LENGTH = 6;
const VERIFY_DELAY_MS = 1500;

export default function VerifyCode() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<RootStackRouteProp<"VerifyCode">>();
  const setUser = useAuthStore((state) => state.setUser);

  // Get email from route params or default
  const email = route.params?.email || "";

  // State
  const [code, setCode] = useState<string[]>(createEmptyOTPArray(CODE_LENGTH));
  const [timer, setTimer] = useState(RESEND_TIMER_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  // Refs
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const mounted = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Timer countdown
  useEffect(() => {
    if (timer > 0) {
      const countdown = setTimeout(() => {
        if (mounted.current) {
          setTimer(timer - 1);
        }
      }, 1000);
      return () => clearTimeout(countdown);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  // Auto-submit when all digits entered
  useEffect(() => {
    const codeString = code.join("");
    if (codeString.length === CODE_LENGTH && !isVerifying) {
      handleVerify();
    }
  }, [code]);

  // Announce errors to screen readers
  useEffect(() => {
    if (errorMessage) {
      AccessibilityInfo.announceForAccessibility(errorMessage);
    }
  }, [errorMessage]);

  // Shake animation for error
  const shakeError = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Vibrate on error (Android)
    if (Platform.OS === "android") {
      Vibration.vibrate(100);
    }
  }, [shakeAnimation]);

  // Handle code input change
  const handleCodeChange = useCallback(
    (value: string, index: number) => {
      // Only allow numeric input
      if (value && !isValidOTPDigit(value)) return;

      const newCode = [...code];
      newCode[index] = value;
      setCode(newCode);
      setErrorMessage(""); // Clear error on input

      // Auto-advance to next input
      if (value && index < CODE_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
        setCurrentIndex(index + 1);
      }
    },
    [code],
  );

  // Handle backspace
  const handleKeyPress = useCallback(
    (e: KeyPressEvent, index: number) => {
      if (e.nativeEvent.key === "Backspace") {
        const newCode = [...code];

        if (code[index]) {
          // Clear current field
          newCode[index] = "";
          setCode(newCode);
        } else if (index > 0) {
          // Move to previous field and clear it
          newCode[index - 1] = "";
          setCode(newCode);
          inputRefs.current[index - 1]?.focus();
          setCurrentIndex(index - 1);
        }

        setErrorMessage(""); // Clear error on input
      }
    },
    [code],
  );

  // Handle paste
  const handlePaste = useCallback((pastedText: string) => {
    const newCode = parsePastedOTP(pastedText, CODE_LENGTH);

    if (newCode.some((digit) => digit)) {
      setCode(newCode);

      // Focus the next empty field or last field
      const focusIndex = findNextEmptyIndex(newCode);
      inputRefs.current[focusIndex]?.focus();
      setCurrentIndex(focusIndex);
    }
  }, []);

  // Handle verification
  const handleVerify = useCallback(async () => {
    const codeString = code.join("");

    if (codeString.length !== CODE_LENGTH) {
      setErrorMessage("Please enter all 6 digits");
      shakeError();
      return;
    }

    setIsVerifying(true);
    setErrorMessage("");

    try {
      // Add delay for UX
      await new Promise((resolve) => setTimeout(resolve, VERIFY_DELAY_MS));

      const result = await verifyOtp(email, codeString);

      if (!mounted.current) return;

      if (result.success && result.user) {
        setUser(result.user);

        // Success feedback
        Alert.alert("Success", AUTH_MESSAGES.SUCCESS.VERIFICATION, [
          {
            text: "Continue",
            onPress: () => {
              // Navigate to Tabs screen - TabNavigator will show correct tabs based on role
              navigation.reset({
                index: 0,
                routes: [{ name: "Tabs" }],
              });
            },
          },
        ]);
      } else {
        // Error feedback
        setErrorMessage("Invalid code. Please try again.");
        shakeError();

        // Clear code on error
        setCode(createEmptyOTPArray(CODE_LENGTH));
        inputRefs.current[0]?.focus();
        setCurrentIndex(0);
      }
    } catch (error) {
      const authError = error as AuthError;
      console.error("Verification error:", authError);

      if (!mounted.current) return;

      setErrorMessage("Verification failed. Please try again.");
      shakeError();
    } finally {
      if (mounted.current) {
        setIsVerifying(false);
      }
    }
  }, [code, email, setUser, navigation, shakeError]);

  // Handle resend
  const handleResend = useCallback(async () => {
    if (!canResend || isResending) return;

    setIsResending(true);
    setErrorMessage("");

    try {
      const result = await resendVerificationCode(email);

      if (!mounted.current) return;

      if (result.success) {
        // Reset timer
        setTimer(RESEND_TIMER_SECONDS);
        setCanResend(false);

        // Clear code
        setCode(createEmptyOTPArray(CODE_LENGTH));
        inputRefs.current[0]?.focus();
        setCurrentIndex(0);

        Alert.alert("Success", "Verification code sent successfully");
      } else {
        Alert.alert("Error", result.error || "Failed to resend code");
      }
    } catch (error) {
      const authError = error as AuthError;
      console.error("Resend error:", authError);

      if (!mounted.current) return;

      Alert.alert("Error", "Failed to resend verification code");
    } finally {
      if (mounted.current) {
        setIsResending(false);
      }
    }
  }, [email, canResend, isResending]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        {/* Header */}
        <AuthHeader />

        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="mail-outline" size={64} color={"#D4AF37"} />
          </View>

          {/* Title */}
          <Text style={styles.title}>Verify Your Email</Text>

          {/* Description */}
          <Text style={styles.description}>We sent a verification code to</Text>
          <Text style={styles.email}>{email}</Text>

          {/* OTP Input */}
          <Animated.View
            style={[
              styles.codeContainer,
              { transform: [{ translateX: shakeAnimation }] },
            ]}
          >
            {Array(CODE_LENGTH)
              .fill(0)
              .map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.codeInputWrapper,
                    currentIndex === index && styles.codeInputActive,
                    code[index] && styles.codeInputFilled,
                    errorMessage && styles.codeInputError,
                  ]}
                >
                  <TextInput
                    ref={(ref) => {
                      inputRefs.current[index] = ref;
                    }}
                    style={styles.codeInput}
                    value={code[index]}
                    onChangeText={(value) => {
                      // Check if it's a paste operation (multiple characters)
                      if (value.length > 1) {
                        handlePaste(value);
                      } else {
                        handleCodeChange(value, index);
                      }
                    }}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    onFocus={() => setCurrentIndex(index)}
                    keyboardType="number-pad"
                    maxLength={CODE_LENGTH} // Allow paste of full code
                    selectTextOnFocus
                    editable={!isVerifying}
                    accessibilityLabel={`Digit ${index + 1} of ${CODE_LENGTH}`}
                    accessibilityHint={`Enter digit ${index + 1} of your verification code`}
                    testID={`otp-input-${index}`}
                  />
                </View>
              ))}
          </Animated.View>

          {/* Error Message */}
          {errorMessage ? (
            <Text style={styles.errorText} accessibilityRole="alert">
              {errorMessage}
            </Text>
          ) : null}

          {/* Resend Timer/Button */}
          <View style={styles.resendContainer}>
            {!canResend ? (
              <View style={styles.timerContainer}>
                <Ionicons name="time-outline" size={16} color={"#4B5563"} />
                <Text style={styles.timerText}>
                  Resend code in {formatTimerDisplay(timer)}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleResend}
                disabled={isResending}
                style={styles.resendButton}
                accessibilityRole="button"
                accessibilityLabel="Resend verification code"
                accessibilityHint="Double tap to resend the verification code"
              >
                {isResending ? (
                  <ActivityIndicator size="small" color={"#D4AF37"} />
                ) : (
                  <Text style={styles.resendText}>Resend Code</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Verify Button */}
          <Button
            variant="primary"
            onPress={handleVerify}
            loading={isVerifying}
            disabled={!isCompleteOTPCode(code, CODE_LENGTH) || isVerifying}
            style={styles.verifyButton}
            accessibilityLabel="Verify code button"
            accessibilityHint={
              isCompleteOTPCode(code, CODE_LENGTH)
                ? "Double tap to verify your code"
                : "Enter all 6 digits to enable"
            }
            testID="verify-button"
          >
            {isVerifying ? "Verifying..." : "Verify"}
          </Button>

          {/* Back to login */}
          <TouchableOpacity
            onPress={() => navigation.navigate("Login")}
            style={styles.backButton}
            disabled={isVerifying}
            accessibilityRole="link"
            accessibilityLabel="Back to login"
            accessibilityHint="Double tap to go back to login"
          >
            <Text style={styles.backText}>Back to Login</Text>
          </TouchableOpacity>
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
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    color: "#D4AF37",
    marginBottom: theme.spacing.md,
    textAlign: "center",
  },
  description: {
    fontSize: theme.typography.fontSize.md,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: theme.spacing.xs,
  },
  email: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: "#D4AF37",
    textAlign: "center",
    marginBottom: theme.spacing.xl,
  },
  codeContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  codeInputWrapper: {
    width: 45,
    height: 56,
    borderWidth: 2,
    borderColor: "#374151",
    borderRadius: theme.borderRadius.md,
    backgroundColor: "#000000",
  },
  codeInputActive: {
    borderColor: "#D4AF37",
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  codeInputFilled: {
    borderColor: "#FFFFFF",
  },
  codeInputError: {
    borderColor: "#EF4444",
  },
  codeInput: {
    flex: 1,
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: "#FFFFFF",
    textAlign: "center",
  },
  errorText: {
    fontSize: theme.typography.fontSize.sm,
    color: "#EF4444",
    textAlign: "center",
    marginBottom: theme.spacing.md,
  },
  resendContainer: {
    marginBottom: theme.spacing.xl,
    minHeight: 40,
    justifyContent: "center",
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  timerText: {
    fontSize: theme.typography.fontSize.sm,
    color: "#4B5563",
  },
  resendButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  resendText: {
    fontSize: theme.typography.fontSize.md,
    color: "#D4AF37",
    fontWeight: theme.typography.fontWeight.semibold,
  },
  verifyButton: {
    width: "100%",
    marginBottom: theme.spacing.lg,
  },
  backButton: {
    paddingVertical: theme.spacing.md,
  },
  backText: {
    fontSize: theme.typography.fontSize.md,
    color: "#FFFFFF",
    textDecorationLine: "underline",
  },
});
