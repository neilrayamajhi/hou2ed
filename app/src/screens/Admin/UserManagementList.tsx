import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { colors, spacing, typography, radius } from "../../theme/tokens";
import { RootStackNavigationProp } from "../../navigation/types";
import {
  listUsers,
  type UserRole,
  type UserSummary,
} from "../../services/userModeration.service";
import StatusBadge, { type StatusBadgeTone } from "../../components/admin/StatusBadge";
import AvatarInitial from "../../components/admin/AvatarInitial";

const ROLE_FILTERS: { label: string; value: UserRole | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Seekers", value: "seeker" },
  { label: "Providers", value: "provider" },
  { label: "Admins", value: "admin" },
];

const ROLE_TONE: Record<UserRole, StatusBadgeTone> = {
  admin: "primary",
  provider: "success",
  seeker: "neutral",
};

export default function UserManagementList() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const [roleFilter, setRoleFilter] = useState<UserRole | undefined>(
    undefined,
  );
  const [search, setSearch] = useState("");

  const {
    data: users,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["adminUsers", roleFilter, search],
    queryFn: () => listUsers({ role: roleFilter, search: search || undefined }),
  });

  const renderItem = ({ item }: { item: UserSummary }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => navigation.navigate("UserDetail", { userId: item.id })}
      accessibilityRole="button"
      accessibilityLabel={`View ${item.fullName}`}
      activeOpacity={0.7}
    >
      <AvatarInitial name={item.fullName || item.username} />
      <View style={styles.rowBody}>
        <Text style={styles.userName} numberOfLines={1}>
          {item.fullName || item.username}
        </Text>
        <Text style={styles.userEmail} numberOfLines={1}>
          {item.email}
        </Text>
        <View style={styles.badgeRow}>
          <StatusBadge label={item.role} tone={ROLE_TONE[item.role]} />
          {item.isBanned && <StatusBadge label="Banned" tone="danger" />}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.gray[600]} />
    </TouchableOpacity>
  );

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
        <View>
          <Text style={styles.headerTitle}>Users</Text>
          {!isLoading && !isError && (
            <Text style={styles.headerSubtitle}>
              {users?.length ?? 0} {users?.length === 1 ? "person" : "people"}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={18} color={colors.gray[500]} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search name, username, or email"
          placeholderTextColor={colors.gray[500]}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.filterRow}>
        {ROLE_FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.label}
            style={[
              styles.filterChip,
              roleFilter === filter.value && styles.filterChipActive,
            ]}
            onPress={() => setRoleFilter(filter.value)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterChipText,
                roleFilter === filter.value && styles.filterChipTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : isError ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.red} />
          <Text style={styles.errorText}>Failed to load users</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={users || []}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={[
            styles.listContainer,
            (!users || users.length === 0) && styles.emptyListContainer,
          ]}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name="people-outline"
                size={56}
                color={colors.gray[700]}
              />
              <Text style={styles.emptyStateTitle}>No users found</Text>
              <Text style={styles.emptyStateSubtitle}>
                Try a different search term or filter.
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary[500]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
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
  headerSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.gray[500],
    marginTop: 2,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.gray[850],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray[800],
  },
  searchInput: {
    flex: 1,
    color: colors.gray[50],
    fontSize: typography.sizes.sm,
  },
  filterRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.gray[800],
    backgroundColor: colors.gray[850],
  },
  filterChipActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  filterChipText: {
    fontSize: typography.sizes.xs,
    color: colors.gray[400],
    fontWeight: "600",
  },
  filterChipTextActive: { color: colors.gray[900] },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  errorText: {
    fontSize: typography.sizes.md,
    color: colors.red,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  retryButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary[500],
    borderRadius: radius.md,
  },
  retryButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.gray[900],
  },
  listContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  emptyListContainer: { flexGrow: 1 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing["3xl"],
  },
  emptyStateTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: "600",
    color: colors.gray[300],
    marginTop: spacing.lg,
  },
  emptyStateSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.gray[500],
    marginTop: spacing.xs,
  },
  separator: { height: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.gray[850],
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[800],
  },
  rowBody: { flex: 1, gap: 2 },
  userName: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.gray[50],
  },
  userEmail: {
    fontSize: typography.sizes.sm,
    color: colors.gray[500],
    marginBottom: spacing.xs,
  },
  badgeRow: { flexDirection: "row", gap: spacing.xs },
});
