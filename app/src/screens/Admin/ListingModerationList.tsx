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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { colors, spacing, typography, radius } from "../../theme/tokens";
import { RootStackNavigationProp } from "../../navigation/types";
import {
  listAllListingsForAdmin,
  type AdminListingSummary,
} from "../../services/listingModeration.service";

const STATUS_FILTERS: { label: string; value: "active" | "inactive" | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

export default function ListingModerationList() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | undefined>(
    undefined,
  );

  const {
    data: listings,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["adminListings", statusFilter],
    queryFn: () => listAllListingsForAdmin({ status: statusFilter }),
  });

  const renderItem = ({ item }: { item: AdminListingSummary }) => (
    <TouchableOpacity
      style={styles.listingCard}
      onPress={() =>
        navigation.navigate("ListingModerationDetail", { listingId: item.id })
      }
      accessibilityRole="button"
      accessibilityLabel={`View ${item.title}`}
    >
      <View style={styles.listingCardHeader}>
        <Text style={styles.listingTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <View
          style={[
            styles.badge,
            item.isActive ? styles.activeBadge : styles.inactiveBadge,
          ]}
        >
          <Text style={styles.badgeText}>
            {item.isActive ? "Active" : "Inactive"}
          </Text>
        </View>
      </View>
      <View style={styles.detailRow}>
        <Ionicons name="location-outline" size={14} color={colors.gray[400]} />
        <Text style={styles.detailText}>{item.city}</Text>
        <Text style={styles.detailDot}>·</Text>
        <Text style={styles.detailText}>{item.housingType}</Text>
        {item.verified && (
          <Ionicons
            name="checkmark-circle"
            size={14}
            color={colors.green}
            style={{ marginLeft: spacing.xs }}
          />
        )}
      </View>
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
        <Text style={styles.headerTitle}>Listings</Text>
      </View>

      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.label}
            style={[
              styles.filterChip,
              statusFilter === filter.value && styles.filterChipActive,
            ]}
            onPress={() => setStatusFilter(filter.value)}
          >
            <Text
              style={[
                styles.filterChipText,
                statusFilter === filter.value && styles.filterChipTextActive,
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
          <Text style={styles.errorText}>Failed to load listings</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={listings || []}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContainer,
            (!listings || listings.length === 0) && styles.emptyListContainer,
          ]}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="home-outline" size={64} color={colors.gray[600]} />
              <Text style={styles.emptyStateTitle}>No listings found</Text>
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
  filterChipActive: { backgroundColor: colors.primary[500], borderColor: colors.primary[500] },
  filterChipText: { fontSize: typography.sizes.xs, color: colors.gray[400], fontWeight: "600" },
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
  retryButtonText: { fontSize: typography.sizes.md, fontWeight: "600", color: colors.gray[900] },
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
  listingCard: {
    backgroundColor: colors.gray[850],
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[800],
  },
  listingCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  listingTitle: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.gray[50],
    flex: 1,
    marginRight: spacing.sm,
  },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm },
  activeBadge: { backgroundColor: colors.green },
  inactiveBadge: { backgroundColor: colors.gray[600] },
  badgeText: { fontSize: typography.sizes.xs, fontWeight: "600", color: colors.white },
  detailRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  detailText: { fontSize: typography.sizes.sm, color: colors.gray[400] },
  detailDot: { color: colors.gray[600] },
});
