import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography, radius } from "../../theme/tokens";
import { supabase } from "../../lib/supabase";
import { getBlockedUsers, unblockUser } from "../../services/blockingService";
import type { RootStackNavigationProp } from "../../navigation/types";

interface BlockedUser {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  blocked_at: string;
}

export default function BlockedUsersScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unblockingUserId, setUnblockingUserId] = useState<string | null>(null);

  const fetchBlockedUsers = useCallback(async () => {
    try {
      setLoading(true);

      // Get list of blocked user IDs
      const blockedUserIds = await getBlockedUsers();

      if (blockedUserIds.length === 0) {
        setBlockedUsers([]);
        return;
      }

      // Fetch full profile data for blocked users
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .in("id", blockedUserIds);

      if (error) {
        console.error("Error fetching blocked users profiles:", error);
        Alert.alert("Error", "Failed to load blocked users");
        return;
      }

      // Get block timestamps
      const { data: blocks } = await supabase
        .from("blocks")
        .select("blocked_id, created_at")
        .in("blocked_id", blockedUserIds);

      // Merge profile data with block timestamps
      const usersWithTimestamps = profiles?.map((profile) => {
        const block = blocks?.find((b) => b.blocked_id === profile.id);
        return {
          ...profile,
          blocked_at: block?.created_at || new Date().toISOString(),
        };
      }) || [];

      setBlockedUsers(usersWithTimestamps);
    } catch (error) {
      console.error("Error in fetchBlockedUsers:", error);
      Alert.alert("Error", "Failed to load blocked users");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBlockedUsers();
  }, [fetchBlockedUsers]);

  const handleUnblock = useCallback(
    async (userId: string, username: string) => {
      Alert.alert(
        "Unblock User",
        `Are you sure you want to unblock ${username}?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Unblock",
            style: "default",
            onPress: async () => {
              try {
                setUnblockingUserId(userId);

                const result = await unblockUser(userId);

                if (result.success) {
                  // Remove from local state
                  setBlockedUsers((prev) =>
                    prev.filter((user) => user.id !== userId)
                  );
                  Alert.alert("Success", `${username} has been unblocked`);
                } else {
                  Alert.alert("Error", result.error || "Failed to unblock user");
                }
              } catch (error) {
                console.error("Error unblocking user:", error);
                Alert.alert("Error", "Failed to unblock user");
              } finally {
                setUnblockingUserId(null);
              }
            },
          },
        ]
      );
    },
    []
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBlockedUsers();
  }, [fetchBlockedUsers]);

  const renderBlockedUser = useCallback(
    ({ item }: { item: BlockedUser }) => {
      const isUnblocking = unblockingUserId === item.id;
      const blockedDate = new Date(item.blocked_at).toLocaleDateString();

      return (
        <View style={styles.userCard}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              {item.avatar_url ? (
                <Image
                  source={{ uri: item.avatar_url }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="person-outline" size={24} color="#FFD700" />
              )}
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{item.full_name || item.username}</Text>
              <Text style={styles.username}>@{item.username}</Text>
              <Text style={styles.blockedDate}>Blocked on {blockedDate}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.unblockButton, isUnblocking && styles.unblockButtonDisabled]}
            onPress={() => handleUnblock(item.id, item.username)}
            disabled={isUnblocking}
            accessibilityLabel={`Unblock ${item.username}`}
            accessibilityRole="button"
          >
            {isUnblocking ? (
              <ActivityIndicator size="small" color="#FFD700" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFD700" />
                <Text style={styles.unblockButtonText}>Unblock</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      );
    },
    [unblockingUserId, handleUnblock]
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={64} color="#FFD700" />
      <Text style={styles.emptyTitle}>No Blocked Users</Text>
      <Text style={styles.emptyMessage}>
        You haven't blocked anyone yet. When you block a user, they'll appear here.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color="#FFD700" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blocked Users</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Loading blocked users...</Text>
        </View>
      ) : (
        <FlatList
          data={blockedUsers}
          renderItem={renderBlockedUser}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            blockedUsers.length === 0 && styles.listContentEmpty,
          ]}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#FFD700"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: "#1a1a1a",
    borderBottomWidth: 1,
    borderBottomColor: "#FFD700",
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.h3,
    color: "#FFD700",
    flex: 1,
    textAlign: "center",
    fontWeight: "bold",
  },
  headerRight: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: "#FFD700",
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  listContentEmpty: {
    flex: 1,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1a1a1a",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#FFD700",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: spacing.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
  },
  userDetails: {
    flex: 1,
    gap: 2,
  },
  userName: {
    ...typography.bodyBold,
    color: "#FFFFFF",
  },
  username: {
    ...typography.small,
    color: "#FFD700",
  },
  blockedDate: {
    ...typography.tiny,
    color: "#999999",
  },
  unblockButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#FFD700",
    backgroundColor: "#000000",
  },
  unblockButtonDisabled: {
    opacity: 0.5,
  },
  unblockButtonText: {
    ...typography.smallBold,
    color: "#FFD700",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyTitle: {
    ...typography.h3,
    color: "#FFD700",
    textAlign: "center",
    fontWeight: "bold",
  },
  emptyMessage: {
    ...typography.body,
    color: "#CCCCCC",
    textAlign: "center",
    maxWidth: 300,
  },
});
