import React from "react";
import {
  Alert,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useBlockUser,
  useUnblockUser,
  useBlockStatus,
} from "../hooks/useBlocking";
import { useToast } from "./ui/Toast";
import { colors, spacing, radius, typography } from "../theme/tokens";

type BlockButtonProps = {
  userId: string;
  userName: string;
  userRole: "seeker" | "provider";
  variant?: "default" | "icon" | "text";
  onBlockSuccess?: () => void;
  onUnblockSuccess?: () => void;
};

/**
 * Block/unblock button component
 * Allows users to block/unblock providers or seekers
 * - When provider blocks seeker: auto-rejects active applications
 * - When seeker blocks provider: hides provider's listings
 */
export function BlockButton({
  userId,
  userName,
  userRole,
  variant = "default",
  onBlockSuccess,
  onUnblockSuccess,
}: BlockButtonProps) {
  const { blockStatus, isLoading: isLoadingStatus } = useBlockStatus(userId);
  const blockMutation = useBlockUser();
  const unblockMutation = useUnblockUser();
  const { showToast } = useToast();

  const isBlocked = blockStatus?.isBlockedByMe || false;
  const isLoading =
    isLoadingStatus || blockMutation.isPending || unblockMutation.isPending;

  const handlePress = () => {
    if (isBlocked) {
      // Unblock without confirmation
      unblockMutation.mutate(userId, {
        onSuccess: () => {
          showToast(`Unblocked ${userName}`, "success");
          onUnblockSuccess?.();
        },
        onError: (error: Error) => {
          showToast(error.message || "Failed to unblock user", "error");
        },
      });
    } else {
      // Block with confirmation
      const message =
        userRole === "provider"
          ? `Are you sure you want to block ${userName}? You will no longer see their listings.`
          : `Are you sure you want to block ${userName}? Their active applications will be automatically rejected.`;

      Alert.alert(
        `Block ${userRole === "provider" ? "Provider" : "Seeker"}`,
        message,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Block",
            style: "destructive",
            onPress: () => {
              blockMutation.mutate(userId, {
                onSuccess: () => {
                  showToast(`Blocked ${userName}`, "success");
                  onBlockSuccess?.();
                },
                onError: (error: Error) => {
                  showToast(error.message || "Failed to block user", "error");
                },
              });
            },
          },
        ],
      );
    }
  };

  if (variant === "icon") {
    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={isLoading}
        style={styles.iconButton}
        accessibilityLabel={
          isBlocked ? `Unblock ${userName}` : `Block ${userName}`
        }
        accessibilityRole="button"
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.red} />
        ) : (
          <Ionicons
            name={isBlocked ? "checkmark-circle" : "ban"}
            size={24}
            color={isBlocked ? colors.gray[400] : colors.red}
          />
        )}
      </TouchableOpacity>
    );
  }

  if (variant === "text") {
    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={isLoading}
        style={styles.textButton}
        accessibilityLabel={
          isBlocked ? `Unblock ${userName}` : `Block ${userName}`
        }
        accessibilityRole="button"
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.red} />
        ) : (
          <Text
            style={[styles.textButtonLabel, isBlocked && styles.unblockedText]}
          >
            {isBlocked ? "Unblock" : "Block User"}
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  // Default variant: button
  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isLoading}
      style={[styles.button, isBlocked && styles.unblockedButton]}
      accessibilityLabel={
        isBlocked ? `Unblock ${userName}` : `Block ${userName}`
      }
      accessibilityRole="button"
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={isBlocked ? colors.gray[400] : colors.white}
        />
      ) : (
        <>
          <Ionicons
            name={isBlocked ? "checkmark-circle-outline" : "ban-outline"}
            size={18}
            color={isBlocked ? colors.gray[400] : colors.white}
            style={styles.buttonIcon}
          />
          <Text
            style={[styles.buttonText, isBlocked && styles.unblockedButtonText]}
          >
            {isBlocked ? "Unblock" : "Block"}
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
    backgroundColor: colors.red,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    minWidth: 100,
  },
  unblockedButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.gray[600],
  },
  buttonIcon: {
    marginRight: spacing.sm,
  },
  buttonText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: "600",
  },
  unblockedButtonText: {
    color: colors.gray[400],
  },
  iconButton: {
    padding: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  textButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  textButtonLabel: {
    color: colors.red,
    fontSize: typography.sizes.md,
    fontWeight: "600",
  },
  unblockedText: {
    color: colors.gray[400],
  },
});
