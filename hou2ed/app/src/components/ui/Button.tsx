import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from "react-native";
import { HIT_SLOP } from "../../utils/a11y";

interface ButtonProps extends TouchableOpacityProps {
  variant?: "primary" | "secondary" | "ghost";
  size?: "lg" | "md";
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  children,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  // Type-safe style getters with proper typing
  const getVariantStyle = () => {
    switch (variant) {
      case "secondary":
        return styles.secondary;
      case "ghost":
        return styles.ghost;
      default:
        return styles.primary;
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case "lg":
        return styles.lg;
      default:
        return styles.md;
    }
  };

  const getTextVariantStyle = () => {
    switch (variant) {
      case "secondary":
        return styles.secondaryText;
      case "ghost":
        return styles.ghostText;
      default:
        return styles.primaryText;
    }
  };

  const getTextSizeStyle = () => {
    switch (size) {
      case "lg":
        return styles.lgText;
      default:
        return styles.mdText;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.base,
        getVariantStyle(),
        getSizeStyle(),
        isDisabled && styles.disabled,
        style,
      ]}
      disabled={isDisabled}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "primary" ? "#000000" : "#FFD700"}
          size="small"
        />
      ) : (
        <Text
          style={[
            styles.text,
            getTextVariantStyle(),
            getTextSizeStyle(),
            isDisabled && styles.disabledText,
          ]}
        >
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    minHeight: 48,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 44,
  },
  primary: {
    backgroundColor: "#FFD700",
  },
  secondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#FFD700",
  },
  ghost: {
    backgroundColor: "transparent",
  },
  lg: {
    minHeight: 56,
    paddingHorizontal: 24,
  },
  md: {
    minHeight: 48,
    paddingHorizontal: 20,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: "600",
  },
  primaryText: {
    color: "#000000",
  },
  secondaryText: {
    color: "#FFD700",
  },
  ghostText: {
    color: "#FFFFFF",
  },
  lgText: {
    fontSize: 18,
  },
  mdText: {
    fontSize: 16,
  },
  disabledText: {
    opacity: 0.8,
  },
});
