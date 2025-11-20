import React from "react";
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
import {
  colors,
  spacing,
  typography,
  radius,
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

  const getStatusColor = (status: ApplicationStatus) => {
    switch (status) {
      case "new":
        return colors.primary[500];
      case "under_review":
        return colors.primary[400];
      case "approved":
        return "#10b981"; // green
      case "rejected":
        return colors.red;
      case "waitlisted":
        return colors.yellow;
      case "withdrawn":
        return colors.gray[500];
      default:
        return colors.gray[600];
    }
  };

  const getStatusLabel = (status: ApplicationStatus) => {
    switch (status) {
      case "new":
        return "New";
      case "under_review":
        return "Under Review";
      case "approved":
        return "Approved";
      case "rejected":
        return "Rejected";
      case "waitlisted":
        return "Waitlisted";
      case "withdrawn":
        return "Withdrawn";
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const renderApplicationItem = ({
    item,
    index,
  }: {
    item: Application;
    index: number;
  }) => {
    const statusColor = getStatusColor(item.status);
    const statusLabel = getStatusLabel(item.status);
    const seekerName =
      item.seeker?.full_name || item.seeker?.email || "Applicant";
    const listingTitle = item.listing?.title || "Unknown Listing";

    return (
      <TouchableOpacity
        style={styles.applicationCard}
        onPress={() =>
          navigation.navigate("ApplicationDetail", { applicationId: item.id })
        }
        accessibilityLabel={`Application ${index + 1} from ${seekerName}`}
        accessibilityRole="button"
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            <Text style={styles.applicationNumber}>{index + 1}.</Text>
            <Text style={styles.seekerName} numberOfLines={1}>
              {seekerName}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{statusLabel}</Text>
          </View>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Ionicons
              name="home-outline"
              size={16}
              color={colors.gray[400]}
            />
            <Text style={styles.detailText} numberOfLines={1}>
              {listingTitle}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons
              name="calendar-outline"
              size={16}
              color={colors.gray[400]}
            />
            <Text style={styles.detailText}>
              Applied: {formatDate(item.created_at)}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.gray[500]}
          />
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="document-text-outline" size={64} color={colors.gray[600]} />
      <Text style={styles.emptyStateTitle}>No Applications Yet</Text>
      <Text style={styles.emptyStateSubtitle}>
        Applications from seekers will appear here
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={colors.gray[50]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Applications</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={colors.gray[50]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Applications</Text>
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle" size={64} color={colors.red} />
          <Text style={styles.errorText}>Failed to load applications</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
        <Text style={styles.headerTitle}>Applications</Text>
      </View>

      <FlatList
        data={applications || []}
        renderItem={renderApplicationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContainer,
          (!applications || applications.length === 0) &&
            styles.emptyListContainer,
        ]}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary[500]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
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
    marginRight: spacing.md,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: "700",
    color: colors.gray[50],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
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
    padding: spacing.lg,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
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
    backgroundColor: colors.gray[850],
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[800],
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: spacing.sm,
  },
  applicationNumber: {
    fontSize: typography.sizes.md,
    fontWeight: "700",
    color: colors.primary[500],
    marginRight: spacing.sm,
  },
  seekerName: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.gray[50],
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  statusText: {
    fontSize: typography.sizes.xs,
    fontWeight: "600",
    color: colors.white,
  },
  cardDetails: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  detailText: {
    fontSize: typography.sizes.sm,
    color: colors.gray[300],
    flex: 1,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: spacing.sm,
  },
});
