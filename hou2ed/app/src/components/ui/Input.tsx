import React, { useState } from "react";
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helpText?: string;
  secureTextEntry?: boolean;
  showPasswordToggle?: boolean;
  maxLength?: number;
}

export default function Input({
  label,
  error,
  helpText,
  secureTextEntry: secureTextEntryProp = false,
  showPasswordToggle = false,
  style,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const shouldHideText = secureTextEntryProp && !isPasswordVisible;

  return (
    <View style={styles.container}>
      {label && label.trim() !== "" && (
        <Text style={styles.label}>{label}</Text>
      )}
      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.focused,
          error && styles.errorBorder,
        ]}
      >
        <TextInput
          autoComplete="off"
          textContentType="none"
          importantForAutofill="no"
          {...props}
          style={[styles.input, style]}
          placeholderTextColor="#666666"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={shouldHideText}
          accessibilityLabel={label || props.placeholder}
          accessibilityHint={error || helpText}
          accessibilityState={{ disabled: props.editable === false }}
        />
        {secureTextEntryProp && showPasswordToggle && (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={styles.eyeIcon}
            accessibilityLabel={
              isPasswordVisible ? "Hide password" : "Show password"
            }
            accessibilityRole="button"
          >
            <Ionicons
              name={isPasswordVisible ? "eye-off" : "eye"}
              size={20}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      {helpText && !error && <Text style={styles.helpText}>{helpText}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    color: "#FFFFFF",
    fontSize: 14,
    marginBottom: 8,
    fontWeight: "500",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#000000",
    borderWidth: 1,
    borderColor: "#FFFFFF",
    borderRadius: 8,
    minHeight: 48,
    overflow: "hidden",
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    backgroundColor: "transparent",
  },
  focused: {
    borderColor: "#FFD700",
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  errorBorder: {
    borderColor: "#FF3B30",
  },
  error: {
    color: "#FF3B30",
    fontSize: 12,
    marginTop: 4,
  },
  helpText: {
    color: "#666666",
    fontSize: 12,
    marginTop: 4,
  },
  eyeIcon: {
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
  },
});
