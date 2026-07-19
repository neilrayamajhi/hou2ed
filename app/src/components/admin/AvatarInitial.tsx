import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, radius, typography } from "../../theme/tokens";

interface AvatarInitialProps {
  name: string | null | undefined;
  size?: number;
}

export default function AvatarInitial({ name, size = 40 }: AvatarInitialProps) {
  const initial = (name ?? "").trim().charAt(0).toUpperCase() || "?";

  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.4 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: "rgba(212, 175, 55, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: colors.primary[400],
    fontWeight: "700",
  },
});
