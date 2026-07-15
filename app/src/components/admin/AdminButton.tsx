import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  GestureResponderEvent,
} from "react-native";
import { colors, spacing, radius, typography } from "../../theme/tokens";

export type AdminButtonVariant = "primary" | "destructive" | "secondary";

interface AdminButtonProps {
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  variant?: AdminButtonVariant;
  disabled?: boolean;
  loading?: boolean;
}

export default function AdminButton({
  label,
  onPress,
  variant = "secondary",
  disabled,
  loading,
}: AdminButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[styles.base, styles[variant], isDisabled && styles.disabled]}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled }}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "secondary" ? colors.gray[300] : colors.gray[900]}
        />
      ) : (
        <Text style={[styles.label, styles[`${variant}Label`]]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  primary: {
    backgroundColor: colors.primary[500],
  },
  destructive: {
    backgroundColor: colors.red,
  },
  secondary: {
    backgroundColor: colors.gray[850],
    borderWidth: 1,
    borderColor: colors.gray[700],
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
  },
  primaryLabel: { color: colors.gray[900] },
  destructiveLabel: { color: colors.white },
  secondaryLabel: { color: colors.gray[200] },
});
