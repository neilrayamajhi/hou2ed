import React from "react";
import {
  TouchableOpacity,
  View,
  StyleSheet,
  TouchableOpacityProps,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface CheckboxProps extends Omit<TouchableOpacityProps, "onPress"> {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export default function Checkbox({
  value,
  onValueChange,
  disabled = false,
  style,
  ...props
}: CheckboxProps) {
  return (
    <TouchableOpacity
      style={[
        styles.container,
        value && styles.checked,
        disabled && styles.disabled,
        style,
      ]}
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value, disabled }}
      {...props}
    >
      {value && <Ionicons name="checkmark" size={16} color="#000000" />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 44,
    minHeight: 44,
  },
  checked: {
    backgroundColor: "#FFD700",
    borderColor: "#FFD700",
  },
  disabled: {
    opacity: 0.5,
  },
});
