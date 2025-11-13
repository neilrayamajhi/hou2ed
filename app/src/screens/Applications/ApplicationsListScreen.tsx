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
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography, radius } from "../../theme/tokens";
import { useAuthStore } from "../../state/useAuthStore";
import { supabase } from "../../lib/supabase";
import { deleteApplication, withdrawApplication } from "../../services/application.service";
import type { Application, Listing } from "../../lib/supabase-types";
import { RootStackNavigationProp } from "../../navigation/types";

type ApplicationWithListing = Application & {
  listing: Pick<
    Listing,
    "id" | "title" | "housing_type" | "city" | "state"
  >;
  seeker?: {
    id: string;
    email: string;
    full_name?: string;
  };
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

      // First, check the user's role
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Error fetching user profile:", profileError);
      }

      const userRole = profile?.role || "seeker";

      // Adjust query based on role to include relevant information
      const selectQuery = userRole === "provider"
        ? `
          *,
          listing:listings (
            id,
            title,
            housing_type,
            city,
            state
          ),
          seeker:profiles!applications_seeker_id_fkey (
            id,
            email,
            full_name
          )
        `
        : `
          *,
          listing:listings (
            id,
            title,
            housing_type,
            city,
            state
          )
        `;

      let query = supabase
        .from("applications")
        .select(selectQuery);

      // Query based on user role
      if (userRole === "provider") {
        // For providers, get applications for their listings
        const { data: providerListings } = await supabase
          .from("listings")
          .select("id")
          .eq("provider_id", user.id);

        const listingIds = providerListings?.map(l => l.id) || [];

        if (listingIds.length > 0) {
          query = query.in("listing_id", listingIds);
        } else {
          // Provider has no listings, show empty
          setApplications([]);
          setLoading(false);
          return;
        }
      } else {
        // For seekers, get their own applications
        query = query.eq("seeker_id", user.id);
      }

      // Filter out soft-deleted applications and withdrawn applications for both providers and seekers
      query = query
        .is("deleted_at", null)
        .neq("status", "withdrawn");

      const { data, error: fetchError } = await query
        .order("created_at", { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setApplications((data as ApplicationWithListing[]) || []);

      // Log for debugging
      console.log(`User role: ${userRole}, Applications found: ${data?.length || 0}`);
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

  const handleDeleteApplication = useCallback(async (applicationId: string, status: string) => {
    // Show confirmation dialog
    Alert.alert(
      "Delete Application",
      "Are you sure you want to delete this application? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await deleteApplication(applicationId);
              if (result.success) {
                // Immediately remove from local state for instant UI update
                setApplications(prevApps =>
                  prevApps.filter(app => app.id !== applicationId)
                );

                Alert.alert("Success", "Application deleted successfully");

                // Also fetch from server to ensure consistency
                setTimeout(() => {
                  fetchApplications();
                }, 500); // Small delay to ensure database update completes
              } else {
                Alert.alert("Error", result.error || "Failed to delete application");
              }
            } catch (error) {
              Alert.alert("Error", "An unexpected error occurred");
              console.error("Delete error:", error);
            }
          },
        },
      ]
    );
  }, [fetchApplications]);

  const handleWithdrawApplication = useCallback(async (applicationId: string) => {
    Alert.alert(
      "Withdraw Application",
      "Are you sure you want to withdraw this application?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Withdraw",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await withdrawApplication(applicationId);
              if (result.success) {
                // Immediately remove from local state for instant UI update
                setApplications(prevApps =>
                  prevApps.filter(app => app.id !== applicationId)
                );

                Alert.alert("Success", "Application withdrawn successfully");

                // Also fetch from server to ensure consistency
                setTimeout(() => {
                  fetchApplications();
                }, 500); // Small delay to ensure database update completes
              } else {
                Alert.alert("Error", result.error || "Failed to withdraw application");
              }
            } catch (error) {
              Alert.alert("Error", "An unexpected error occurred");
              console.error("Withdraw error:", error);
            }
          },
        },
      ]
    );
  }, [fetchApplications]);

  const renderApplicationItem = useCallback(
    ({ item, index }: { item: ApplicationWithListing; index: number }) => {
      const statusColor = getStatusColor(item.status);
      const statusLabel = getStatusLabel(item.status);

      return (
        <TouchableOpacity
          style={styles.applicationCard}
          onPress={() => {
            // TODO: Navigate to application details screen
            console.log("View application:", item.id);
          }}
          accessibilityLabel={`Application ${index + 1} for ${item.listing?.title || "Unknown"}`}
          accessibilityRole="button"
        >
          <View style={styles.cardHeader}>
            <View style={styles.titleContainer}>
              <Text style={styles.applicationNumber}>{index + 1}.</Text>
              <Text style={styles.listingName} numberOfLines={2}>
                {item.listing?.title || "Unknown Listing"}
              </Text>
            </View>
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
                {item.listing?.city || "N/A"},{" "}
                {item.listing?.state || "N/A"}
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
            <View style={styles.actionButtons}>
              {/* Show different actions based on status */}
              {(item.status === 'new' || item.status === 'under_review' ||
                item.status === 'docs_needed' || item.status === 'interview_scheduled') && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.withdrawButton]}
                  onPress={() => handleWithdrawApplication(item.id)}
                  accessibilityLabel="Withdraw application"
                >
                  <Ionicons name="close-circle-outline" size={18} color={colors.yellow} />
                  <Text style={styles.withdrawButtonText}>Withdraw</Text>
                </TouchableOpacity>
              )}

              {(item.status === 'withdrawn' || item.status === 'rejected' ||
                item.status === 'new' || item.status === 'draft') && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDeleteApplication(item.id, item.status)}
                  accessibilityLabel="Delete application"
                >
                  <Ionicons name="trash-outline" size={18} color={colors.red} />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.gray[500]}
            />
          </View>
        </TouchableOpacity>
      );
    },
    [handleDeleteApplication, handleWithdrawApplication],
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
          extraData={applications.length} // Force re-render when data changes
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
  titleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  applicationNumber: {
    fontSize: typography.sizes.lg,
    fontWeight: "700",
    color: colors.primary[400],
    minWidth: 24,
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.sm,
  },
  actionButtons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  withdrawButton: {
    borderColor: colors.yellow,
    backgroundColor: `${colors.yellow}10`,
  },
  withdrawButtonText: {
    fontSize: typography.sizes.xs,
    color: colors.yellow,
    fontWeight: "600",
  },
  deleteButton: {
    borderColor: colors.red,
    backgroundColor: `${colors.red}10`,
  },
  deleteButtonText: {
    fontSize: typography.sizes.xs,
    color: colors.red,
    fontWeight: "600",
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
