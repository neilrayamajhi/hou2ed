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
import { glowCard } from "../../components/admin/adminTheme";
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
import StatusBadge, { type StatusBadgeTone } from "../../components/admin/StatusBadge";
import AdminButton from "../../components/admin/AdminButton";
import AvatarInitial from "../../components/admin/AvatarInitial";

type UserDetailRouteProp = RouteProp<
  { UserDetail: { userId: string } },
  "UserDetail"
>;

const ROLES: UserRole[] = ["seeker", "provider", "admin"];
const ROLE_TONE: Record<UserRole, StatusBadgeTone> = {
  admin: "primary",
  provider: "success",
  seeker: "neutral",
};

export default function UserDetail() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<UserDetailRouteProp>();
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [banReason, setBanReason] = useState("");
  const [pendingAdminPromotion, setPendingAdminPromotion] = useState(false);
  const [adminConfirmText, setAdminConfirmText] = useState("");

  const ADMIN_CONFIRM_PHRASE = "GRANT ADMIN";

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
        setPendingAdminPromotion(false);
        setAdminConfirmText("");
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

    // Granting admin is the single most dangerous mistake an admin can make
    // here - it gets a dedicated typed-confirmation flow instead of a quick
    // tap-through Alert.
    if (role === "admin") {
      setAdminConfirmText("");
      setPendingAdminPromotion(true);
      return;
    }

    Alert.alert(
      "Change Role",
      `Change ${user.fullName || user.email}'s role to ${role}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: () => {
            Alert.alert(
              "Are you sure?",
              `${user.fullName || user.email} will immediately lose access tied to their current role.`,
              [
                { text: "Cancel", style: "cancel" },
                { text: "Confirm", onPress: () => roleMutation.mutate(role) },
              ],
            );
          },
        },
      ],
    );
  };

  const handleConfirmAdminPromotion = () => {
    if (!user || adminConfirmText.trim().toUpperCase() !== ADMIN_CONFIRM_PHRASE) return;
    roleMutation.mutate("admin");
  };

  const handleBan = () => {
    if (!user || !banReason.trim()) return;
    Alert.alert(
      "Ban User",
      `Ban ${user.fullName || user.email}? They will be unable to log in.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Are you sure?",
              "Double-check the reason you entered is accurate before confirming.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Ban User",
                  style: "destructive",
                  onPress: () => banMutation.mutate(),
                },
              ],
            );
          },
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
            <View style={styles.identityRow}>
              <AvatarInitial name={user.fullName || user.username} size={52} />
              <View style={styles.identityBody}>
                <Text style={styles.name}>{user.fullName || user.username}</Text>
                <Text style={styles.email}>{user.email}</Text>
              </View>
            </View>
            <View style={styles.badgeRow}>
              <StatusBadge label={user.role} tone={ROLE_TONE[user.role]} />
              {user.isBanned && <StatusBadge label="Banned" tone="danger" />}
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
            <View style={styles.selfNoteBox}>
              <Ionicons name="information-circle-outline" size={18} color={colors.gray[500]} />
              <Text style={styles.selfNote}>
                You can't ban, delete, or change the role of your own account.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.eyebrow}>Role</Text>
              <View style={styles.roleRow}>
                {ROLES.map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[
                      styles.roleChip,
                      user.role === role && styles.roleChipActive,
                    ]}
                    disabled={isMutating || pendingAdminPromotion}
                    onPress={() => handleChangeRole(role)}
                    activeOpacity={0.8}
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

              {pendingAdminPromotion && (
                <View style={styles.dangerPanel}>
                  <View style={styles.dangerPanelHeader}>
                    <Ionicons name="warning" size={18} color={colors.primary[500]} />
                    <Text style={styles.dangerPanelTitle}>Grant Admin Access</Text>
                  </View>
                  <Text style={styles.dangerPanelText}>
                    {user.fullName || user.email} will get full admin
                    powers - user management, listing moderation, bans, and
                    account deletion. Type{" "}
                    <Text style={styles.dangerPanelPhrase}>{ADMIN_CONFIRM_PHRASE}</Text>{" "}
                    to confirm.
                  </Text>
                  <TextInput
                    style={styles.confirmInput}
                    placeholder={ADMIN_CONFIRM_PHRASE}
                    placeholderTextColor={colors.gray[600]}
                    value={adminConfirmText}
                    onChangeText={setAdminConfirmText}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />
                  <AdminButton
                    label="Grant Admin Access"
                    variant="destructive"
                    disabled={
                      isMutating ||
                      adminConfirmText.trim().toUpperCase() !== ADMIN_CONFIRM_PHRASE
                    }
                    loading={roleMutation.isPending}
                    onPress={handleConfirmAdminPromotion}
                  />
                  <AdminButton
                    label="Cancel"
                    variant="secondary"
                    onPress={() => {
                      setPendingAdminPromotion(false);
                      setAdminConfirmText("");
                    }}
                  />
                </View>
              )}

              <Text style={styles.eyebrow}>
                {user.isBanned ? "Ban Status" : "Ban User"}
              </Text>
              {user.isBanned ? (
                <AdminButton
                  label="Unban User"
                  variant="secondary"
                  disabled={isMutating}
                  loading={unbanMutation.isPending}
                  onPress={handleUnban}
                />
              ) : (
                <>
                  <TextInput
                    style={styles.reasonInput}
                    placeholder="Reason for ban (required)"
                    placeholderTextColor={colors.gray[500]}
                    value={banReason}
                    onChangeText={setBanReason}
                    multiline
                  />
                  {!banReason.trim() && (
                    <Text style={styles.helperText}>
                      A reason is required before you can ban this user.
                    </Text>
                  )}
                  <AdminButton
                    label="Ban User"
                    variant="destructive"
                    disabled={isMutating || !banReason.trim()}
                    loading={banMutation.isPending}
                    onPress={handleBan}
                  />
                </>
              )}

              <Text style={styles.eyebrow}>Danger Zone</Text>
              <AdminButton
                label="Delete Account"
                variant="destructive"
                disabled={isMutating}
                loading={deleteMutation.isPending}
                onPress={handleDelete}
              />
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
    borderBottomWidth: 2,
    borderBottomColor: "rgba(212, 175, 55, 0.25)",
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
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.subtle,
    ...glowCard,
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  identityBody: { flex: 1 },
  name: {
    fontSize: typography.sizes.xl,
    fontWeight: "700",
    color: colors.gray[50],
    marginBottom: 2,
  },
  email: { fontSize: typography.sizes.sm, color: colors.gray[400] },
  badgeRow: { flexDirection: "row", gap: spacing.xs },
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
  selfNoteBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.gray[850],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray[800],
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  selfNote: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.gray[500],
  },
  eyebrow: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.gray[500],
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  roleRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
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
  helperText: {
    fontSize: typography.sizes.xs,
    color: colors.gray[500],
    marginBottom: spacing.sm,
  },
  dangerPanel: {
    backgroundColor: "rgba(212, 175, 55, 0.08)",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.35)",
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  dangerPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  dangerPanelTitle: {
    fontSize: typography.sizes.md,
    fontWeight: "700",
    color: colors.gray[50],
  },
  dangerPanelText: {
    fontSize: typography.sizes.sm,
    color: colors.gray[300],
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  dangerPanelPhrase: {
    fontWeight: "700",
    color: colors.primary[400],
  },
  confirmInput: {
    backgroundColor: colors.gray[900],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray[700],
    padding: spacing.md,
    color: colors.gray[50],
    fontSize: typography.sizes.sm,
    marginBottom: spacing.sm,
    letterSpacing: 1,
  },
});
