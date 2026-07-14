import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { colors, spacing, typography, radius, shadows } from "../../theme/tokens";
import { RootStackNavigationProp } from "../../navigation/types";
import {
  getReportDetail,
  markReportReviewed,
  actionReport,
} from "../../services/reports.service";

type ReportDetailRouteProp = RouteProp<
  { ReportDetail: { reportId: string } },
  "ReportDetail"
>;

export default function ReportDetail() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<ReportDetailRouteProp>();
  const queryClient = useQueryClient();
  const { reportId } = route.params;

  const {
    data: report,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["adminReportDetail", reportId],
    queryFn: () => getReportDetail(reportId),
  });

  const invalidateAndGoBack = async () => {
    await queryClient.invalidateQueries({ queryKey: ["adminOpenReports"] });
    await queryClient.invalidateQueries({ queryKey: ["adminReportDetail", reportId] });
    navigation.goBack();
  };

  const reviewMutation = useMutation({
    mutationFn: () => markReportReviewed(reportId),
    onSuccess: async (result) => {
      if (result.success) {
        await invalidateAndGoBack();
      } else {
        Alert.alert("Error", result.error || "Failed to update report");
      }
    },
  });

  const actionMutation = useMutation({
    mutationFn: (action: "warn" | "ban") => actionReport(reportId, action),
    onSuccess: async (result) => {
      if (result.success) {
        await invalidateAndGoBack();
      } else {
        Alert.alert("Error", result.error || "Failed to action report");
      }
    },
  });

  const isMutating = reviewMutation.isPending || actionMutation.isPending;

  const handleWarn = () => {
    if (!report) return;
    Alert.alert(
      "Warn User",
      `Mark this report as actioned with a warning to ${report.reportedUserName}? No message is actually sent yet — this just records the decision.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Warn", onPress: () => actionMutation.mutate("warn") },
      ],
    );
  };

  const handleBan = () => {
    if (!report) return;
    Alert.alert(
      "Ban User",
      `Ban ${report.reportedUserName}? They will be unable to log in.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Ban",
          style: "destructive",
          onPress: () => actionMutation.mutate("ban"),
        },
      ],
    );
  };

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
        <Text style={styles.headerTitle}>Report Detail</Text>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : isError || !report ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.red} />
          <Text style={styles.errorText}>Failed to load report</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{report.status}</Text>
              </View>
            </View>
            <Text style={styles.sectionLabel}>Reported User</Text>
            <Text style={styles.value}>{report.reportedUserName}</Text>

            <Text style={styles.sectionLabel}>Reported By</Text>
            <Text style={styles.value}>{report.reporterName}</Text>

            <Text style={styles.sectionLabel}>Reason</Text>
            <Text style={styles.reasonText}>{report.reason}</Text>

            {report.reviewedAt && (
              <>
                <Text style={styles.sectionLabel}>Reviewed</Text>
                <Text style={styles.value}>
                  {new Date(report.reviewedAt).toLocaleString()}
                </Text>
              </>
            )}
          </View>

          {report.status === "open" && (
            <>
              <Text style={styles.sectionTitle}>Actions</Text>
              <TouchableOpacity
                style={styles.actionButton}
                disabled={isMutating}
                onPress={() => reviewMutation.mutate()}
              >
                <Text style={styles.actionButtonText}>Mark Reviewed</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                disabled={isMutating}
                onPress={handleWarn}
              >
                <Text style={styles.actionButtonText}>Warn User</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.destructiveButton]}
                disabled={isMutating}
                onPress={handleBan}
              >
                <Text style={styles.actionButtonText}>Ban User</Text>
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
  badgeRow: { flexDirection: "row", marginBottom: spacing.md },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.primary[500],
  },
  badgeText: { fontSize: typography.sizes.xs, fontWeight: "600", color: colors.gray[900] },
  sectionLabel: {
    fontSize: typography.sizes.xs,
    color: colors.gray[500],
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  value: { fontSize: typography.sizes.md, color: colors.gray[50] },
  reasonText: { fontSize: typography.sizes.sm, color: colors.gray[300], lineHeight: 20 },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.gray[50],
    marginBottom: spacing.sm,
  },
  actionButton: {
    backgroundColor: colors.gray[850],
    borderWidth: 1,
    borderColor: colors.gray[800],
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  destructiveButton: { backgroundColor: colors.red, borderColor: colors.red },
  actionButtonText: { fontSize: typography.sizes.md, fontWeight: "600", color: colors.white },
});
