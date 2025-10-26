import React, { useState } from "react";
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
import {
  colors,
  spacing,
  typography,
  radius,
  shadows,
} from "../../theme/tokens";
import { RootStackNavigationProp } from "../../navigation/types";
import { useProviderApplications } from "../../hooks/useProviderApplications";
import type {
  Application,
  ApplicationStatus,
} from "../../services/application.service";

export default function ApplicationsInbox() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const {
    data: applications,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useProviderApplications();
  const [filter, setFilter] = useState<"all" | ApplicationStatus>("all");

  // Filter applications based on selected filter
  const filteredApplications =
    applications?.filter((app) => {
      if (filter === "all") return true;
      return app.status === filter;
    }) || [];

  // Count applications by status
  const statusCounts = {
    new: applications?.filter((a) => a.status === "new").length || 0,
    under_review:
      applications?.filter((a) => a.status === "under_review").length || 0,
    approved: applications?.filter((a) => a.status === "approved").length || 0,
    rejected: applications?.filter((a) => a.status === "rejected").length || 0,
  };

  const getStatusColor = (status: ApplicationStatus) => {
    switch (status) {
      case "new":
        return colors.blue;
      case "under_review":
        return colors.yellow;
      case "approved":
        return colors.green;
      case "rejected":
        return colors.red;
      case "waitlisted":
        return colors.orange;
      default:
        return colors.gray[400];
    }
  };

  const getStatusIcon = (status: ApplicationStatus) => {
    switch (status) {
      case "new":
        return "mail-unread-outline";
      case "under_review":
        return "time-outline";
      case "approved":
        return "checkmark-circle-outline";
      case "rejected":
        return "close-circle-outline";
      case "waitlisted":
        return "list-outline";
      default:
        return "document-outline";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

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
        <Text style={styles.headerTitle}>Applications</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContainer}
        showsHorizontalScrollIndicator={false}
      >
        <TouchableOpacity
          style={[styles.filterTab, filter === "all" && styles.filterTabActive]}
          onPress={() => setFilter("all")}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === "all" && styles.filterTabTextActive,
            ]}
          >
            All ({applications?.length || 0})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === "new" && styles.filterTabActive]}
          onPress={() => setFilter("new")}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === "new" && styles.filterTabTextActive,
            ]}
          >
            New ({statusCounts.new})
          </Text>
          {statusCounts.new > 0 && <View style={styles.badge} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === "under_review" && styles.filterTabActive,
          ]}
          onPress={() => setFilter("under_review")}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === "under_review" && styles.filterTabTextActive,
            ]}
          >
            In Review ({statusCounts.under_review})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === "approved" && styles.filterTabActive,
          ]}
          onPress={() => setFilter("approved")}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === "approved" && styles.filterTabTextActive,
            ]}
          >
            Approved ({statusCounts.approved})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === "rejected" && styles.filterTabActive,
          ]}
          onPress={() => setFilter("rejected")}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === "rejected" && styles.filterTabTextActive,
            ]}
          >
            Rejected ({statusCounts.rejected})
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Applications List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary[500]}
          />
        }
      >
        {isLoading && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
          </View>
        )}

        {isError && (
          <View style={styles.centerContainer}>
            <Ionicons
              name="alert-circle-outline"
              size={48}
              color={colors.red}
            />
            <Text style={styles.errorText}>Failed to load applications</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => refetch()}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isLoading && !isError && filteredApplications.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons
              name="document-text-outline"
              size={64}
              color={colors.gray[600]}
            />
            <Text style={styles.emptyStateTitle}>
              {filter === "all"
                ? "No applications yet"
                : `No ${filter} applications`}
            </Text>
            <Text style={styles.emptyStateSubtitle}>
              {filter === "all"
                ? "Applications from seekers will appear here"
                : "Try selecting a different filter"}
            </Text>
          </View>
        )}

        {filteredApplications.map((application) => (
          <TouchableOpacity
            key={application.id}
            style={styles.applicationCard}
            onPress={() => {
              navigation.navigate("ApplicationDetail", {
                applicationId: application.id,
              });
            }}
            accessibilityLabel={`Application from ${(application as any).seeker?.full_name || "Unknown"}`}
            accessibilityRole="button"
          >
            {/* Status indicator */}
            <View
              style={[
                styles.statusIndicator,
                { backgroundColor: getStatusColor(application.status) },
              ]}
            />

            <View style={styles.applicationContent}>
              {/* Header */}
              <View style={styles.applicationHeader}>
                <View style={styles.seekerInfo}>
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons
                      name="person"
                      size={20}
                      color={colors.gray[500]}
                    />
                  </View>
                  <View style={styles.seekerDetails}>
                    <Text style={styles.seekerName}>
                      {(application as any).seeker?.full_name ||
                        "Unknown Applicant"}
                    </Text>
                    <Text style={styles.timeAgo}>
                      {formatDate(application.created_at)}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: `${getStatusColor(application.status)}20`,
                    },
                  ]}
                >
                  <Ionicons
                    name={getStatusIcon(application.status) as any}
                    size={14}
                    color={getStatusColor(application.status)}
                  />
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: getStatusColor(application.status) },
                    ]}
                  >
                    {application.status.replace("_", " ")}
                  </Text>
                </View>
              </View>

              {/* Listing info */}
              <View style={styles.listingInfo}>
                <Ionicons
                  name="home-outline"
                  size={14}
                  color={colors.gray[400]}
                />
                <Text style={styles.listingTitle} numberOfLines={1}>
                  {(application as any).listing?.title || "Unknown Listing"}
                </Text>
              </View>

              {/* Message preview */}
              {application.application_data?.additionalInfo && (
                <Text style={styles.messagePreview} numberOfLines={2}>
                  {application.application_data.additionalInfo}
                </Text>
              )}

              {/* Footer */}
              <View style={styles.applicationFooter}>
                <View style={styles.contactInfo}>
                  <Ionicons
                    name="mail-outline"
                    size={12}
                    color={colors.gray[500]}
                  />
                  <Text style={styles.contactText}>
                    {(application as any).seeker?.email || "No email"}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.gray[600]}
                />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[900],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[800],
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.sizes.lg,
    fontWeight: "600",
    color: colors.gray[50],
    textAlign: "center",
  },
  headerSpacer: {
    width: 40,
  },
  filterScroll: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[800],
  },
  filterContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.gray[850],
    borderWidth: 1,
    borderColor: colors.gray[800],
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  filterTabActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  filterTabText: {
    fontSize: typography.sizes.sm,
    color: colors.gray[300],
    fontWeight: "500",
  },
  filterTabTextActive: {
    color: colors.gray[900],
    fontWeight: "600",
  },
  badge: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.red,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  centerContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing["3xl"],
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
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing["3xl"],
    paddingHorizontal: spacing.xl,
  },
  emptyStateTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: "600",
    color: colors.gray[300],
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  emptyStateSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.gray[500],
    textAlign: "center",
  },
  applicationCard: {
    flexDirection: "row",
    backgroundColor: colors.gray[850],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray[800],
    marginBottom: spacing.md,
    overflow: "hidden",
    ...shadows.subtle,
  },
  statusIndicator: {
    width: 4,
  },
  applicationContent: {
    flex: 1,
    padding: spacing.md,
  },
  applicationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  seekerInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray[800],
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  seekerDetails: {
    flex: 1,
  },
  seekerName: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.gray[50],
    marginBottom: 2,
  },
  timeAgo: {
    fontSize: typography.sizes.xs,
    color: colors.gray[500],
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  statusBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  listingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  listingTitle: {
    fontSize: typography.sizes.sm,
    color: colors.gray[400],
    flex: 1,
  },
  messagePreview: {
    fontSize: typography.sizes.sm,
    color: colors.gray[300],
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  applicationFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  contactInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  contactText: {
    fontSize: typography.sizes.xs,
    color: colors.gray[500],
  },
});
