import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../theme";
import Button from "./Button";

interface VerificationModalProps {
  visible: boolean;
  email: string;
  onComplete: (code: string) => void;
  onResend: () => Promise<void>;
}

export default function VerificationModal({
  visible,
  email,
  onComplete,
  onResend,
}: VerificationModalProps) {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (visible && resendTimer > 0) {
      const timer = setTimeout(() => {
        setResendTimer(resendTimer - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (resendTimer === 0) {
      setCanResend(true);
    }
  }, [visible, resendTimer]);

  const handleCodeChange = (value: string, index: number) => {
    setError("");

    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits are entered
    if (value && index === 5 && newCode.every((digit) => digit)) {
      handleVerify(newCode.join(""));
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !code[index] && index > 0) {
      // Move focus to previous input on backspace
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (fullCode?: string) => {
    const codeToVerify = fullCode || code.join("");

    if (codeToVerify.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    setIsVerifying(true);
    try {
      // Simulate verification delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // For demo, accept any 6-digit code
      onComplete(codeToVerify);
    } catch (error) {
      setError("Invalid code. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    try {
      await onResend();
      setResendTimer(30);
      setCanResend(false);
      setCode(["", "", "", "", "", ""]);
      setError("");
      Alert.alert(
        "Code Sent",
        "A new verification code has been sent to your email",
      );
    } catch (error) {
      Alert.alert("Error", "Failed to resend code. Please try again.");
    }
  };

  const maskedEmail = email.replace(/^(.{2})(.*)(@.*)$/, "$1***$3");

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => {}}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Enter Verification Code</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                // Reset state but don't close - user must verify
                setCode(["", "", "", "", "", ""]);
                setError("");
              }}
            >
              <Ionicons name="refresh" size={24} color={"#D4AF37"} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Enter the code we sent to {maskedEmail}
          </Text>

          {/* Code Input Boxes */}
          <View style={styles.codeContainer}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                style={[
                  styles.codeInput,
                  digit ? styles.codeInputFilled : {},
                  error ? styles.codeInputError : {},
                ]}
                value={digit}
                onChangeText={(value) => handleCodeChange(value, index)}
                onKeyPress={({ nativeEvent }) =>
                  handleKeyPress(nativeEvent.key, index)
                }
                keyboardType="number-pad"
                maxLength={1}
                autoFocus={index === 0}
                selectTextOnFocus
              />
            ))}
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          {/* Resend Code */}
          <View style={styles.resendContainer}>
            {canResend ? (
              <TouchableOpacity onPress={handleResend}>
                <Text style={styles.resendLink}>Resend code</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.resendTimer}>
                Resend code in {resendTimer}s
              </Text>
            )}
          </View>

          {/* Verify Button */}
          <Button
            variant="primary"
            onPress={() => handleVerify()}
            loading={isVerifying}
            disabled={isVerifying || code.some((digit) => !digit)}
            style={styles.verifyButton}
          >
            Verify
          </Button>

          {/* Help Text */}
          <Text style={styles.helpText}>
            Didn't receive the code? Check your spam folder or try resending.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxWidth: 400,
    backgroundColor: "#000000",
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: "#D4AF37",
    padding: theme.spacing.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#D4AF37",
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  subtitle: {
    color: "#FFFFFF",
    fontSize: 14,
    marginBottom: theme.spacing.xl,
    textAlign: "center",
  },
  codeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacing.lg,
  },
  codeInput: {
    width: 45,
    height: 55,
    borderWidth: 1,
    borderColor: "#FFFFFF",
    borderRadius: theme.borderRadius.md,
    backgroundColor: "#000000",
    color: "#D4AF37",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  codeInputFilled: {
    borderColor: "#D4AF37",
    backgroundColor: "rgba(212, 175, 55, 0.1)",
  },
  codeInputError: {
    borderColor: "#EF4444",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    textAlign: "center",
    marginBottom: theme.spacing.md,
  },
  resendContainer: {
    alignItems: "center",
    marginBottom: theme.spacing.lg,
  },
  resendTimer: {
    color: "#FFFFFF",
    fontSize: 14,
  },
  resendLink: {
    color: "#D4AF37",
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  verifyButton: {
    marginBottom: theme.spacing.md,
  },
  helpText: {
    color: "#FFFFFF",
    fontSize: 12,
    textAlign: "center",
    opacity: 0.7,
  },
});
