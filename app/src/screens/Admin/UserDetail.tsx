import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { colors, spacing, typography, radius, shadows } from "../../theme/tokens";
import { RootStackNavigationProp } from "../../navigation/types";
import {
  getUserDetail,
  setUserRole,
  banUser,
  unbanUser,
  deleteUserAccount,
  type UserRole,
} from "../../services/userModeration.service";
import { useAuthStore } from "../../state/useAuthStore";

type UserDetailRouteProp = RouteProp<
  { UserDetail: { userId: string } },
  "UserDetail"
>;

const ROLES: UserRole[] = ["seeker", "provider", "admin"];

export default function UserDetail() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<UserDetailRouteProp>();
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [banReason, setBanReason] = useState("");

  const { userId } = route.params;

  const {
    data: user,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["adminUserDetail", userId],
    queryFn: () => getUserDetail(userId),
  });

  const invalidateAndGoBack = async () => {
    await queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    await queryClient.invalidateQueries({ queryKey: ["adminUserDetail", userId] });
  };

  const roleMutation = useMutation({
    mutationFn: (role: UserRole) => setUserRole(userId, role),
    onSuccess: async (result) => {
      if (result.success) {
        await invalidateAndGoBack();
      } else {
        Alert.alert("Error", result.error || "Failed to change role");
      }
    },
  });

  const banMutation = useMutation({
    mutationFn: () => banUser(userId, banReason),
    onSuccess: async (result) => {
      if (result.success) {
        setBanReason("");
        await invalidateAndGoBack();
      } else {
        Alert.alert("Error", result.error || "Failed to ban user");
      }
    },
  });

  const unbanMutation = useMutation({
    mutationFn: () => unbanUser(userId),
    onSuccess: async (result) => {
      if (result.success) {
        await invalidateAndGoBack();
      } else {
        Alert.alert("Error", result.error || "Failed to unban user");
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteUserAccount(userId),
    onSuccess: async (result) => {
      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
        navigation.goBack();
      } else {
        Alert.alert("Error", result.error || "Failed to delete account");
      }
    },
  });

  const handleChangeRole = (role: UserRole) => {
    if (!user || role === user.role) return;
    Alert.alert(
      "Change Role",
      `Change ${user.fullName || user.email}'s role to ${role}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Change", onPress: () => roleMutation.mutate(role) },
      ],
    );
  };

  const handleBan = () => {
    if (!user) return;
    Alert.alert(
      "Ban User",
      `Ban ${user.fullName || user.email}? They will be unable to log in.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Ban",
          style: "destructive",
          onPress: () => banMutation.mutate(),
        },
      ],
    );
  };

  const handleUnban = () => {
    if (!user) return;
    Alert.alert("Unban User", `Restore access for ${user.fullName || user.email}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Unban", onPress: () => unbanMutation.mutate() },
    ]);
  };

  const handleDelete = () => {
    if (!user) return;
    Alert.alert(
      "Delete Account",
      `This permanently deletes ${user.fullName || user.email} and all of their data. This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Are you absolutely sure?",
              "This is permanent and cannot be reversed.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete Forever",
                  style: "destructive",
                  onPress: () => deleteMutation.mutate(),
                },
              ],
            );
          },
        },
      ],
    );
  };

  const isSelf = user?.id === currentUserId;
  const isMutating =
    roleMutation.isPending ||
    banMutation.isPending ||
    unbanMutation.isPending ||
    deleteMutation.isPending;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={colors.gray[50]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Detail</Text>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : isError || !user ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.red} />
          <Text style={styles.errorText}>Failed to load user</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <Text style={styles.name}>{user.fullName || user.username}</Text>
            <Text style={styles.email}>{user.email}</Text>
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{user.role}</Text>
              </View>
              {user.isBanned && (
                <View style={[styles.badge, styles.bannedBadge]}>
                  <Text style={styles.badgeText}>Banned</Text>
                </View>
              )}
            </View>
            {user.isBanned && user.bannedReason && (
              <Text style={styles.bannedReason}>Reason: {user.bannedReason}</Text>
            )}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{user.listingsCount}</Text>
              <Text style={styles.statLabel}>Listings</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{user.applicationsCount}</Text>
              <Text style={styles.statLabel}>Applications</Text>
            </View>
          </View>

          {isSelf ? (
            <Text style={styles.selfNote}>
              You can't ban, delete, or change the role of your own account.
            </Text>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Role</Text>
              <View style={styles.roleRow}>
                {ROLES.map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[
                      styles.roleChip,
                      user.role === role && styles.roleChipActive,
                    ]}
                    disabled={isMutating}
                    onPress={() => handleChangeRole(role)}
                  >
                    <Text
                      style={[
                        styles.roleChipText,
                        user.role === role && styles.roleChipTextActive,
                      ]}
                    >
                      {role}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionTitle}>
                {user.isBanned ? "Ban Status" : "Ban User"}
              </Text>
              {user.isBanned ? (
                <TouchableOpacity
                  style={styles.actionButton}
                  disabled={isMutating}
                  onPress={handleUnban}
                >
                  <Text style={styles.actionButtonText}>Unban User</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TextInput
                    style={styles.reasonInput}
                    placeholder="Reason for ban (optional)"
                    placeholderTextColor={colors.gray[500]}
                    value={banReason}
                    onChangeText={setBanReason}
                    multiline
                  />
                  <TouchableOpacity
                    style={[styles.actionButton, styles.destructiveButton]}
                    disabled={isMutating}
                    onPress={handleBan}
                  >
                    <Text style={styles.actionButtonText}>Ban User</Text>
                  </TouchableOpacity>
                </>
              )}

              <Text style={styles.sectionTitle}>Danger Zone</Text>
              <TouchableOpacity
                style={[styles.actionButton, styles.destructiveButton]}
                disabled={isMutating}
                onPress={handleDelete}
              >
                <Text style={styles.actionButtonText}>Delete Account</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[900] },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[800],
  },
  backButton: { padding: spacing.xs, marginRight: spacing.md },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: "700",
    color: colors.gray[50],
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  errorText: { fontSize: typography.sizes.md, color: colors.red, marginTop: spacing.md },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing["5xl"] },
  card: {
    backgroundColor: colors.gray[850],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray[800],
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.subtle,
  },
  name: {
    fontSize: typography.sizes.xl,
    fontWeight: "700",
    color: colors.gray[50],
    marginBottom: spacing.xs,
  },
  email: { fontSize: typography.sizes.sm, color: colors.gray[400], marginBottom: spacing.sm },
  badgeRow: { flexDirection: "row", gap: spacing.xs },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.primary[500],
  },
  bannedBadge: { backgroundColor: colors.red },
  badgeText: { fontSize: typography.sizes.xs, fontWeight: "600", color: colors.white },
  bannedReason: {
    fontSize: typography.sizes.sm,
    color: colors.gray[400],
    marginTop: spacing.sm,
  },
  statsRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg },
  statBox: {
    flex: 1,
    backgroundColor: colors.gray[850],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray[800],
    padding: spacing.lg,
    alignItems: "center",
  },
  statValue: {
    fontSize: typography.sizes["2xl"],
    fontWeight: "700",
    color: colors.primary[500],
  },
  statLabel: { fontSize: typography.sizes.xs, color: colors.gray[400], marginTop: spacing.xs },
  selfNote: {
    fontSize: typography.sizes.sm,
    color: colors.gray[500],
    fontStyle: "italic",
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.gray[50],
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  roleRow: { flexDirection: "row", gap: spacing.sm },
  roleChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.gray[800],
    backgroundColor: colors.gray[850],
  },
  roleChipActive: { backgroundColor: colors.primary[500], borderColor: colors.primary[500] },
  roleChipText: { fontSize: typography.sizes.sm, color: colors.gray[400], fontWeight: "600" },
  roleChipTextActive: { color: colors.gray[900] },
  reasonInput: {
    backgroundColor: colors.gray[850],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray[800],
    padding: spacing.md,
    color: colors.gray[50],
    fontSize: typography.sizes.sm,
    minHeight: 60,
    textAlignVertical: "top",
    marginBottom: spacing.sm,
  },
  actionButton: {
    backgroundColor: colors.gray[850],
    borderWidth: 1,
    borderColor: colors.gray[800],
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  destructiveButton: { backgroundColor: colors.red, borderColor: colors.red },
  actionButtonText: { fontSize: typography.sizes.md, fontWeight: "600", color: colors.white },
});
