import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography, radius } from "../../theme/tokens";
import { useAuthStore } from "../../state/useAuthStore";
import { supabase } from "../../lib/supabase";
import type { Application, Listing } from "../../lib/supabase-types";
import { RootStackNavigationProp } from "../../navigation/types";

type ApplicationWithListing = Application & {
  listing: Pick<
    Listing,
    "id" | "name" | "housing_type" | "district" | "island"
  >;
};

const getStatusColor = (status: Application["status"]) => {
  switch (status) {
    case "submitted":
      return colors.primary[500];
    case "under_review":
      return colors.primary[400];
    case "approved":
      return "#10b981"; // green
    case "rejected":
      return colors.red;
    case "withdrawn":
      return colors.gray[500];
    case "draft":
    default:
      return colors.gray[600];
  }
};

const getStatusLabel = (status: Application["status"]) => {
  switch (status) {
    case "submitted":
      return "Submitted";
    case "under_review":
      return "Under Review";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "withdrawn":
      return "Withdrawn";
    case "draft":
    default:
      return "Draft";
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

export default function ApplicationsListScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { user } = useAuthStore();
  const [applications, setApplications] = useState<ApplicationWithListing[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    if (!user?.id) {
      setError("User not authenticated");
      setLoading(false);
      return;
    }

    try {
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("applications")
        .select(
          `
          *,
          listing:listings (
            id,
            name,
            housing_type,
            district,
            island
          )
        `,
        )
        .eq("seeker_id", user.id)
        .order("created_at", { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setApplications((data as ApplicationWithListing[]) || []);
    } catch (err) {
      console.error("Error fetching applications:", err);
      setError("Failed to load applications. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchApplications();
  }, [fetchApplications]);

  const renderApplicationItem = useCallback(
    ({ item }: { item: ApplicationWithListing }) => {
      const statusColor = getStatusColor(item.status);
      const statusLabel = getStatusLabel(item.status);

      return (
        <TouchableOpacity
          style={styles.applicationCard}
          onPress={() => {
            // TODO: Navigate to application details screen
            console.log("View application:", item.id);
          }}
          accessibilityLabel={`Application for ${item.listing?.name || "Unknown"}`}
          accessibilityRole="button"
        >
          <View style={styles.cardHeader}>
            <Text style={styles.listingName} numberOfLines={2}>
              {item.listing?.name || "Unknown Listing"}
            </Text>
            <View
              style={[styles.statusBadge, { backgroundColor: statusColor }]}
            >
              <Text style={styles.statusText}>{statusLabel}</Text>
            </View>
          </View>

          <View style={styles.cardDetails}>
            <View style={styles.detailRow}>
              <Ionicons
                name="location-outline"
                size={16}
                color={colors.gray[400]}
              />
              <Text style={styles.detailText}>
                {item.listing?.district || "N/A"},{" "}
                {item.listing?.island || "N/A"}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons
                name="home-outline"
                size={16}
                color={colors.gray[400]}
              />
              <Text style={styles.detailText}>
                {item.listing?.housing_type || "N/A"}
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
    },
    [],
  );

  const renderEmptyState = useCallback(() => {
    if (loading) return null;

    return (
      <View style={styles.emptyState}>
        <Ionicons
          name="document-text-outline"
          size={64}
          color={colors.gray[600]}
        />
        <Text style={styles.emptyTitle}>No Applications Yet</Text>
        <Text style={styles.emptyText}>
          When you apply for housing, your applications will appear here.
        </Text>
      </View>
    );
  }, [loading]);

  const renderError = useCallback(() => {
    if (!error) return null;

    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.red} />
        <Text style={styles.errorTitle}>Error</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchApplications}
          accessibilityLabel="Retry"
          accessibilityRole="button"
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }, [error, fetchApplications]);

  if (loading) {
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
          <Text style={styles.headerTitle}>My Applications</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.loadingText}>Loading applications...</Text>
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
        <Text style={styles.headerTitle}>My Applications</Text>
        <View style={styles.placeholder} />
      </View>

      {error ? (
        renderError()
      ) : (
        <FlatList
          data={applications}
          renderItem={renderApplicationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContainer,
            applications.length === 0 && styles.emptyListContainer,
          ]}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
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
  container: {
    flex: 1,
    backgroundColor: colors.gray[900],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[800],
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: "700",
    color: colors.gray[50],
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.sizes.md,
    color: colors.gray[400],
  },
  listContainer: {
    padding: spacing.lg,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  applicationCard: {
    backgroundColor: colors.gray[850],
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[800],
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  listingName: {
    flex: 1,
    fontSize: typography.sizes.lg,
    fontWeight: "600",
    color: colors.gray[50],
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  statusText: {
    fontSize: typography.sizes.xs,
    fontWeight: "600",
    color: colors.white,
  },
  cardDetails: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  detailText: {
    fontSize: typography.sizes.sm,
    color: colors.gray[300],
  },
  cardFooter: {
    alignItems: "flex-end",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: "600",
    color: colors.gray[200],
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: typography.sizes.md,
    color: colors.gray[400],
    textAlign: "center",
    lineHeight: 22,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  errorTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: "600",
    color: colors.gray[200],
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  errorText: {
    fontSize: typography.sizes.md,
    color: colors.gray[400],
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  retryButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.gray[900],
  },
});
