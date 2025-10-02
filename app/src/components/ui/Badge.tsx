import React from "react";
import { View, Text, StyleSheet, ViewProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../theme";

interface BadgeProps extends ViewProps {
  type: "available" | "full" | "verified" | "facility";
  icon?: string;
  label?: string;
  children?: React.ReactNode;
}

export default function Badge({
  type,
  icon,
  label,
  children,
  style,
  ...props
}: BadgeProps) {
  const getIconName = (): keyof typeof Ionicons.glyphMap | null => {
    switch (type) {
      case "verified":
        return "checkmark-circle";
      case "facility":
        return (icon as keyof typeof Ionicons.glyphMap) || "business";
      default:
        return null;
    }
  };

  const iconName = getIconName();

  return (
    <View
      style={[styles.base, styles[type], style]}
      accessibilityRole="text"
      {...props}
    >
      {iconName && (
        <Ionicons
          name={iconName}
          size={14}
          color={
            type === "full" || type === "available"
              ? "#FFFFFF"
              : "#000000"
          }
          style={styles.icon}
        />
      )}
      <Text style={[styles.text, styles[`${type}Text`]]}>
        {children || label || type.charAt(0).toUpperCase() + type.slice(1)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    minHeight: 24,
  },
  available: {
    backgroundColor: "#21C55D",
  },
  full: {
    backgroundColor: "#374151",
  },
  verified: {
    backgroundColor: "#D4AF37",
  },
  facility: {
    backgroundColor: "#D4AF37",
  },
  text: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  availableText: {
    color: "#FFFFFF",
  },
  fullText: {
    color: "#FFFFFF",
  },
  verifiedText: {
    color: "#000000",
  },
  facilityText: {
    color: "#000000",
  },
  icon: {
    marginRight: 4,
  },
});
