import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Button from "./ui/Button";
import { theme } from "../theme";

interface EmptyStateProps {
  message?: string;
  subMessage?: string;
  onClearFilters?: () => void;
  showClearButton?: boolean;
}

const EmptyState = React.memo(function EmptyState({
  message = "No matches found",
  subMessage = "Try adjusting your filters or expanding your search area",
  onClearFilters,
  showClearButton = true,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons
          name="search-outline"
          size={64}
          color={"#374151"}
        />
      </View>
      <Text style={styles.message}>{message}</Text>
      <Text style={styles.subMessage}>{subMessage}</Text>
      {showClearButton && onClearFilters && (
        <Button
          variant="primary"
          onPress={onClearFilters}
          style={styles.button}
        >
          Clear Filters
        </Button>
      )}
    </View>
  );
});

export default EmptyState;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.xxl,
  },
  iconContainer: {
    marginBottom: theme.spacing.lg,
  },
  message: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: theme.spacing.sm,
  },
  subMessage: {
    fontSize: theme.typography.fontSize.md,
    color: "#4B5563",
    textAlign: "center",
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
  },
  button: {
    paddingHorizontal: theme.spacing.xl,
  },
});