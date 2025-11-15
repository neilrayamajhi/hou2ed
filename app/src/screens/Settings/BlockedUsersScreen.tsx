import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useBlockedUsers, useUnblockUser } from "../../hooks/useBlocking";
import {
  colors,
  spacing,
  typography,
  radius,
  shadows,
} from "../../theme/tokens";
import { useToast } from "../../components/ui/Toast";
import type { BlockedUser } from "../../services/block.service";

export default function BlockedUsersScreen() {
  const navigation = useNavigation();
  const { blockedUsers, isLoading, refetch } = useBlockedUsers();
  const unblockMutation = useUnblockUser();
  const { showToast } = useToast();

  const handleUnblock = (user: BlockedUser) => {
    unblockMutation.mutate(user.blocked_id, {
      onSuccess: () => {
        showToast(`Unblocked ${user.blocked_user.full_name}`, "success");
        refetch();
      },
      onError: (error: Error) => {
        showToast(error.message || "Failed to unblock user", "error");
      },
    });
  };

  const renderBlockedUser = ({ item }: { item: BlockedUser }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        {item.blocked_user.avatar_url ? (
          <Image
            source={{ uri: item.blocked_user.avatar_url }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={24} color={colors.gray[400]} />
          </View>
        )}
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{item.blocked_user.full_name}</Text>
          <Text style={styles.userRole}>
            {item.blocked_user.role === "provider" ? "Provider" : "Seeker"}
          </Text>
          <Text style={styles.blockedDate}>
            Blocked {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.unblockButton}
        onPress={() => handleUnblock(item)}
        disabled={unblockMutation.isPending}
      >
        {unblockMutation.isPending ? (
          <ActivityIndicator size="small" color={colors.primary[500]} />
        ) : (
          <Text style={styles.unblockButtonText}>Unblock</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="ban-outline" size={64} color={colors.gray[600]} />
      <Text style={styles.emptyTitle}>No Blocked Users</Text>
      <Text style={styles.emptyText}>
        Users you block will appear here. You won't see their listings or
        applications.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.gray[50]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blocked Users</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : (
        <FlatList
          data={blockedUsers}
          renderItem={renderBlockedUser}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.sizes["2xl"],
    fontWeight: "600",
    color: colors.gold,
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.darkGray,
    borderRadius: radius.md,
    padding: spacing.lg,
    ...shadows.subtle,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: radius.full,
    marginRight: spacing.md,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: radius.full,
    backgroundColor: colors.gray[800],
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: typography.sizes.lg,
    fontWeight: "600",
    color: colors.white,
    marginBottom: spacing.xs,
  },
  userRole: {
    fontSize: typography.sizes.sm,
    color: colors.gray[400],
    marginBottom: spacing.xs,
  },
  blockedDate: {
    fontSize: typography.sizes.xs,
    color: colors.gray[500],
  },
  unblockButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    minWidth: 80,
    alignItems: "center",
  },
  unblockButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.black,
  },
  separator: {
    height: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing["4xl"],
  },
  emptyTitle: {
    fontSize: typography.sizes["2xl"],
    fontWeight: "600",
    color: colors.gray[400],
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: typography.sizes.md,
    color: colors.gray[500],
    textAlign: "center",
    lineHeight: 22,
  },
});
