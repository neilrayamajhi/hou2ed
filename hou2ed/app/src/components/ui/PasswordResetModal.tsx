import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import Input from "./Input";
import Button from "./Button";
import { theme } from "../../theme";
import { authHelpers } from "../../lib/supabase";
import {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  BUTTON_TEXT,
} from "../../constants/messages";
import { isValidEmail } from "../../utils/auth";

interface PasswordResetModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function PasswordResetModal({
  visible,
  onClose,
}: PasswordResetModalProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert("Error", ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD);
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert("Error", ERROR_MESSAGES.VALIDATION.INVALID_EMAIL);
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await authHelpers.resetPassword(email);
      if (error) throw error;

      Alert.alert("Success", SUCCESS_MESSAGES.AUTH.RESET_SENT);
      setEmail("");
      onClose();
    } catch (error: any) {
      Alert.alert("Error", error.message || ERROR_MESSAGES.AUTH.RESET_FAILED);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.description}>
            Enter your email address and we'll send you a password reset link
          </Text>

          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />

          <View style={styles.buttonRow}>
            <Button
              variant="secondary"
              onPress={handleClose}
              disabled={isLoading}
              style={styles.button}
            >
              {BUTTON_TEXT.CANCEL}
            </Button>
            <Button
              variant="primary"
              onPress={handleResetPassword}
              loading={isLoading}
              disabled={isLoading}
              style={styles.button}
            >
              Send Reset Link
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    backgroundColor: "#1F2937",
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    width: "90%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "#374151",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#D4AF37",
    marginBottom: theme.spacing.sm,
  },
  description: {
    fontSize: 14,
    color: "#FFFFFF",
    marginBottom: theme.spacing.lg,
    opacity: 0.8,
  },
  input: {
    marginBottom: theme.spacing.lg,
  },
  buttonRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  button: {
    flex: 1,
  },
});
