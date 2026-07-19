import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, radius, typography } from "../../theme/tokens";

export type StatusBadgeTone = "neutral" | "primary" | "success" | "warning" | "danger";

interface StatusBadgeProps {
  label: string;
  tone: StatusBadgeTone;
}

// Soft-tinted pills (low-alpha background, solid-color text) read as more
// deliberate/professional on a dark surface than solid saturated fills —
// the same convention used by most dark-mode admin tools (GitHub, Linear).
const TONE_STYLES: Record<StatusBadgeTone, { bg: string; text: string }> = {
  neutral: { bg: "rgba(156, 163, 175, 0.16)", text: colors.gray[300] },
  primary: { bg: "rgba(212, 175, 55, 0.16)", text: colors.primary[400] },
  success: { bg: "rgba(33, 197, 93, 0.16)", text: colors.green },
  warning: { bg: "rgba(245, 158, 11, 0.16)", text: colors.amber },
  danger: { bg: "rgba(239, 68, 68, 0.16)", text: colors.red },
};

export default function StatusBadge({ label, tone }: StatusBadgeProps) {
  const toneStyle = TONE_STYLES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: toneStyle.bg }]}>
      <Text style={[styles.text, { color: toneStyle.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  text: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
});
