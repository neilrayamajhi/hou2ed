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

const ROLE_FILTERS: { label: string; value: UserRole | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Seekers", value: "seeker" },
  { label: "Providers", value: "provider" },
  { label: "Admins", value: "admin" },
];

function roleColor(role: UserRole) {
  switch (role) {
    case "admin":
      return colors.primary[500];
    case "provider":
      return colors.green;
    default:
      return colors.gray[500];
  }
}

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
      style={styles.userCard}
      onPress={() => navigation.navigate("UserDetail", { userId: item.id })}
      accessibilityRole="button"
      accessibilityLabel={`View ${item.fullName}`}
    >
      <View style={styles.userCardHeader}>
        <Text style={styles.userName} numberOfLines={1}>
          {item.fullName || item.username}
        </Text>
        <View style={styles.badgeRow}>
          {item.isBanned && (
            <View style={[styles.badge, styles.bannedBadge]}>
              <Text style={styles.badgeText}>Banned</Text>
            </View>
          )}
          <View style={[styles.badge, { backgroundColor: roleColor(item.role) }]}>
            <Text style={styles.badgeText}>{item.role}</Text>
          </View>
        </View>
      </View>
      <Text style={styles.userEmail} numberOfLines={1}>
        {item.email}
      </Text>
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
        <Text style={styles.headerTitle}>Users</Text>
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
          contentContainerStyle={[
            styles.listContainer,
            (!users || users.length === 0) && styles.emptyListContainer,
          ]}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name="people-outline"
                size={64}
                color={colors.gray[600]}
              />
              <Text style={styles.emptyStateTitle}>No users found</Text>
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
  listContainer: { padding: spacing.lg },
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
  userCard: {
    backgroundColor: colors.gray[850],
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[800],
  },
  userCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  userName: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.gray[50],
    flex: 1,
    marginRight: spacing.sm,
  },
  badgeRow: { flexDirection: "row", gap: spacing.xs },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  bannedBadge: { backgroundColor: colors.red },
  badgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: "600",
    color: colors.white,
  },
  userEmail: { fontSize: typography.sizes.sm, color: colors.gray[400] },
});
