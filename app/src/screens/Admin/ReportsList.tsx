import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
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
  listOpenReports,
  listRecentBlocksForAdmin,
  type ReportSummary,
  type RecentBlockSummary,
} from "../../services/reports.service";

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ReportsList() {
  const navigation = useNavigation<RootStackNavigationProp>();

  const {
    data: reports,
    isLoading: reportsLoading,
    isError: reportsError,
    refetch: refetchReports,
    isRefetching: reportsRefetching,
  } = useQuery({ queryKey: ["adminOpenReports"], queryFn: listOpenReports });

  const {
    data: blocks,
    isLoading: blocksLoading,
    refetch: refetchBlocks,
  } = useQuery({
    queryKey: ["adminRecentBlocks"],
    queryFn: listRecentBlocksForAdmin,
  });

  const handleRefresh = () => {
    refetchReports();
    refetchBlocks();
  };

  const renderReport = (item: ReportSummary) => (
    <TouchableOpacity
      key={item.id}
      style={styles.card}
      onPress={() => navigation.navigate("ReportDetail", { reportId: item.id })}
      accessibilityRole="button"
      accessibilityLabel={`Report against ${item.reportedUserName}`}
      activeOpacity={0.7}
    >
      <View style={styles.reportIconContainer}>
        <Ionicons name="flag" size={16} color={colors.red} />
      </View>
      <View style={styles.reportBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.reportedUserName}
          </Text>
          <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
        </View>
        <Text style={styles.reportReason} numberOfLines={2}>
          {item.reason}
        </Text>
        <Text style={styles.reportedBy}>Reported by {item.reporterName}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.gray[600]} />
    </TouchableOpacity>
  );

  const renderBlock = (item: RecentBlockSummary, index: number) => (
    <View
      key={item.id}
      style={[styles.blockRow, index > 0 && styles.blockRowDivider]}
    >
      <Ionicons name="ban-outline" size={16} color={colors.gray[500]} />
      <Text style={styles.blockText} numberOfLines={1}>
        {item.blockerName} blocked {item.blockedName}
      </Text>
      <Text style={styles.blockDate}>{formatDate(item.createdAt)}</Text>
    </View>
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
        <Text style={styles.headerTitle}>Reports</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={!!reportsRefetching}
            onRefresh={handleRefresh}
            tintColor={colors.primary[500]}
          />
        }
      >
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.eyebrow}>Open Reports</Text>
          {!reportsLoading && !reportsError && reports && reports.length > 0 && (
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>{reports.length}</Text>
            </View>
          )}
        </View>
        {reportsLoading ? (
          <ActivityIndicator
            size="large"
            color={colors.primary[500]}
            style={styles.loader}
          />
        ) : reportsError ? (
          <Text style={styles.errorText}>Failed to load reports</Text>
        ) : !reports || reports.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="checkmark-circle-outline"
              size={48}
              color={colors.gray[600]}
            />
            <Text style={styles.emptyStateText}>No open reports</Text>
          </View>
        ) : (
          reports.map(renderReport)
        )}

        <Text style={styles.eyebrow}>Recent Blocks</Text>
        {blocksLoading ? (
          <ActivityIndicator size="small" color={colors.primary[500]} />
        ) : !blocks || blocks.length === 0 ? (
          <Text style={styles.emptyStateSubtext}>No recent blocks</Text>
        ) : (
          <View style={styles.blocksCard}>{blocks.map(renderBlock)}</View>
        )}
      </ScrollView>
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
  scrollContent: { padding: spacing.lg, paddingBottom: spacing["5xl"] },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  eyebrow: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.gray[500],
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  countPill: {
    minWidth: 20,
    height: 20,
    borderRadius: radius.full,
    backgroundColor: "rgba(239, 68, 68, 0.16)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  countPillText: { fontSize: typography.sizes.xs, fontWeight: "700", color: colors.red },
  loader: { marginTop: spacing.xl },
  errorText: { fontSize: typography.sizes.sm, color: colors.red },
  emptyState: { alignItems: "center", paddingVertical: spacing["2xl"] },
  emptyStateText: {
    fontSize: typography.sizes.md,
    color: colors.gray[400],
    marginTop: spacing.sm,
  },
  emptyStateSubtext: { fontSize: typography.sizes.sm, color: colors.gray[500] },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.gray[850],
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[800],
  },
  reportIconContainer: {
    width: 30,
    height: 30,
    borderRadius: radius.md,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  reportBody: { flex: 1 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  cardTitle: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.gray[50],
    flex: 1,
    marginRight: spacing.sm,
  },
  cardDate: { fontSize: typography.sizes.xs, color: colors.gray[500] },
  reportReason: {
    fontSize: typography.sizes.sm,
    color: colors.gray[300],
    marginBottom: spacing.xs,
  },
  reportedBy: { fontSize: typography.sizes.xs, color: colors.gray[500] },
  blocksCard: {
    backgroundColor: colors.gray[850],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray[800],
    padding: spacing.md,
  },
  blockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  blockRowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.gray[800],
  },
  blockText: { flex: 1, fontSize: typography.sizes.sm, color: colors.gray[300] },
  blockDate: { fontSize: typography.sizes.xs, color: colors.gray[500] },
});
