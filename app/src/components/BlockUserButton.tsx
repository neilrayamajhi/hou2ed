/**
 * Block User Button Component
 * A button that allows users to block/unblock other users
 * Shows different states: Block, Unblock, Loading
 */

import React, { useState, useEffect } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography, radius } from "../theme/tokens";
import {
  blockUser,
  unblockUser,
  hasBlockedUser,
} from "../services/blockingService";

interface BlockUserButtonProps {
  userId: string;
  userName?: string;
  variant?: "primary" | "secondary" | "text";
  onBlockStatusChange?: (isBlocked: boolean) => void;
}

export default function BlockUserButton({
  userId,
  userName = "this user",
  variant = "secondary",
  onBlockStatusChange,
}: BlockUserButtonProps) {
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Load initial block status
  useEffect(() => {
    loadBlockStatus();
  }, [userId]);

  async function loadBlockStatus() {
    setLoading(true);
    try {
      const blocked = await hasBlockedUser(userId);
      setIsBlocked(blocked);
    } catch (error) {
      // Display-only status (which button label to show) - not a safety
      // gate, so default to "not blocked" rather than blocking the UI.
      console.error("Error checking block status:", error);
      setIsBlocked(false);
    }
    setLoading(false);
  }

  async function handleBlockPress() {
    if (actionLoading) return;

    if (isBlocked) {
      // Unblock
      Alert.alert(
        "Unblock User",
        `Unblock ${userName}? You'll be able to see their content again.`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Unblock",
            onPress: async () => {
              setActionLoading(true);
              const result = await unblockUser(userId);
              setActionLoading(false);

              if (result.success) {
                setIsBlocked(false);
                onBlockStatusChange?.(false);
              } else {
                Alert.alert("Error", result.error || "Failed to unblock user");
              }
            },
          },
        ],
      );
    } else {
      // Block
      Alert.alert(
        "Block User",
        `Block ${userName}? They won't be able to:\n• See your profile\n• Send you messages\n• Apply to your listings (if provider)\n\nYou won't see:\n• Their listings (if provider)\n• Their messages\n• Their applications (if provider)`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Block",
            style: "destructive",
            onPress: async () => {
              setActionLoading(true);
              const result = await blockUser(userId);
              setActionLoading(false);

              if (result.success) {
                setIsBlocked(true);
                onBlockStatusChange?.(true);
                Alert.alert("Blocked", `${userName} has been blocked.`);
              } else {
                Alert.alert("Error", result.error || "Failed to block user");
              }
            },
          },
        ],
      );
    }
  }

  if (loading) {
    return (
      <TouchableOpacity style={[styles.button, styles[variant]]} disabled>
        <ActivityIndicator size="small" color={colors.gray[400]} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.button, styles[variant], isBlocked && styles.blocked]}
      onPress={handleBlockPress}
      disabled={actionLoading}
    >
      {actionLoading ? (
        <ActivityIndicator
          size="small"
          color={isBlocked ? colors.primary[400] : colors.red}
        />
      ) : (
        <>
          <Ionicons
            name={isBlocked ? "checkmark-circle" : "ban"}
            size={16}
            color={isBlocked ? colors.primary[400] : colors.red}
          />
          <Text
            style={[
              styles.buttonText,
              styles[`${variant}Text`],
              isBlocked && styles.blockedText,
            ]}
          >
            {isBlocked ? "Blocked" : "Block User"}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  primary: {
    backgroundColor: colors.red,
  },
  secondary: {
    backgroundColor: colors.gray[800],
    borderWidth: 1,
    borderColor: colors.red,
  },
  text: {
    backgroundColor: "transparent",
  },
  blocked: {
    backgroundColor: colors.gray[800],
    borderWidth: 1,
    borderColor: colors.primary[500],
  },
  buttonText: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
  },
  primaryText: {
    color: colors.white,
  },
  secondaryText: {
    color: colors.red,
  },
  textText: {
    color: colors.red,
  },
  blockedText: {
    color: colors.primary[400],
  },
});
