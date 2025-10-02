import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme";

interface OfflineBannerProps {
  visible: boolean;
}

const OfflineBanner = React.memo(function OfflineBanner({ visible }: OfflineBannerProps) {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Ionicons
        name="cloud-offline-outline"
        size={18}
        color={"#000000"}
      />
      <Text style={styles.text}>
        Offline. Changes will sync when connected.
      </Text>
    </View>
  );
});

export default OfflineBanner;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  text: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: "#000000",
  },
});