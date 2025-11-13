import React, { useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  spacing,
  typography,
  radius,
  shadows,
} from "../../theme/tokens";
import { RootStackNavigationProp } from "../../navigation/types";
import { useProviderListings } from "../../hooks/useProviderListings";
import { useProviderApplications } from "../../hooks/useProviderApplications";
import { ActivityIndicator, RefreshControl, Alert } from "react-native";
import { useToast } from "../../components/ui/Toast";
import { useRequireProvider } from "../../hooks/useRequireProvider";
import { useAuthStore } from "../../state/useAuthStore";

// Dashboard now uses live data via useProviderListings

export default function ProviderDashboard() {
  const navigation = useNavigation<RootStackNavigationProp>();
  // TEMPORARILY DISABLED FOR TESTING - anyone can access provider dashboard
  // useRequireProvider();
  const {
    data: listings,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useProviderListings();
  const { data: applications } = useProviderApplications();
  const { showToast } = useToast();
  const { user, logout } = useAuthStore();

  // Track user changes and force refetch when needed
  const lastUserRef = useRef(user?.id);
  const lastRefetchTime = useRef(0);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const timeSinceLastRefetch = now - lastRefetchTime.current;

      // Always refetch when provider dashboard gains focus to ensure fresh data
      if (user?.role === "provider" && user?.id) {
        const userChanged = lastUserRef.current !== user?.id;

        if (userChanged) {
          console.log(
            "🔄 User switch detected in ProviderDashboard - refreshing listings",
            "Previous:",
            lastUserRef.current,
            "Current:",
            user?.id,
          );
          lastUserRef.current = user?.id;

          // On user change, add a delay to ensure auth is fully propagated
          setTimeout(() => {
            console.log("🔄 Triggering delayed refetch after user change");
            refetch();
            lastRefetchTime.current = Date.now();
          }, 1000);
        } else if (timeSinceLastRefetch > 5000) {
          // Only refetch if more than 5 seconds have passed since last refetch
          // This prevents rapid refetching on navigation
          console.log("🔄 Refetching provider listings on focus");
          refetch();
          lastRefetchTime.current = now;
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, user?.role]), // Removed 'refetch' to prevent infinite loop
  );

  const handleLogout = async () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Log Out",
          style: "destructive",
          onPress: () => {
            console.log("Logging out...");
            logout();
            navigation.reset({
              index: 0,
              routes: [{ name: "Login" }],
            });
          },
        },
      ],
      { cancelable: true },
    );
  };

  const totalBeds = (listings || []).reduce(
    (sum, l) => sum + (l.totalBeds || 0),
    0,
  );
  const totalAvailable = (listings || []).reduce(
    (sum, l) => sum + (l.availableBeds || 0),
    0,
  );
  const newApplications = (applications || []).filter(
    (app) => app.status === "new",
  ).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with welcome message */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.welcomeText}>Provider Dashboard</Text>
            <Text style={styles.providerName}>
              {user?.user_metadata?.full_name || "Your Properties"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleLogout}
            style={styles.logoutButton}
            accessibilityLabel="Log out"
            accessibilityRole="button"
          >
            <Ionicons
              name="log-out-outline"
              size={24}
              color={colors.primary[500]}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={!!isRefetching}
            onRefresh={() => refetch()}
            tintColor={colors.primary[500]}
          />
        }
      >
        {/* Compact Stats Overview */}
        <View style={styles.statsOverview}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{(listings || []).length}</Text>
            <Text style={styles.statLabel}>Listings</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalAvailable}</Text>
            <Text style={styles.statLabel}>Available Beds</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{newApplications}</Text>
            <Text style={styles.statLabel}>New Apps</Text>
          </View>
        </View>

        {/* Quick Action Cards - Airbnb Style */}
        <View style={styles.actionsGrid}>
          {/* Create Listing - Primary Action */}
          <TouchableOpacity
            style={[styles.actionCard, styles.primaryAction]}
            onPress={() => navigation.navigate("ListingWizard")}
            accessibilityLabel="Create new listing"
            accessibilityRole="button"
          >
            <View style={styles.actionIconContainer}>
              <Ionicons
                name="add-circle-outline"
                size={28}
                color={colors.gray[900]}
              />
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: colors.gray[900] }]}>
                Create Listing
              </Text>
              <Text
                style={[styles.actionSubtitle, { color: colors.gray[800] }]}
              >
                Add a new property
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.gray[900]}
            />
          </TouchableOpacity>

          {/* Applications - Secondary Action */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("ApplicationsInbox")}
            accessibilityLabel="View applications"
            accessibilityRole="button"
          >
            <View style={styles.actionIconContainer}>
              <Ionicons
                name="document-text-outline"
                size={28}
                color={colors.primary[500]}
              />
              {newApplications > 0 && (
                <View style={styles.actionBadge}>
                  <Text style={styles.actionBadgeText}>{newApplications}</Text>
                </View>
              )}
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Applications</Text>
              <Text style={styles.actionSubtitle}>Review requests</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.gray[400]}
            />
          </TouchableOpacity>

          {/* Update Availability */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("AvailabilityUpdater")}
            accessibilityLabel="Update availability"
            accessibilityRole="button"
          >
            <View style={styles.actionIconContainer}>
              <Ionicons
                name="refresh-outline"
                size={28}
                color={colors.primary[500]}
              />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Update Beds</Text>
              <Text style={styles.actionSubtitle}>Keep counts current</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.gray[400]}
            />
          </TouchableOpacity>
        </View>

        {/* My Listings Section */}
        <View style={styles.listingsSection}>
          <Text style={styles.sectionTitle}>My Listings</Text>

          {isLoading && (
            <View style={{ paddingVertical: spacing.xl, alignItems: "center" }}>
              <ActivityIndicator size="large" color={colors.primary[500]} />
            </View>
          )}

          {isError && (
            <View style={styles.listingCard}>
              <Text style={{ color: colors.red }}>
                Failed to load listings.
              </Text>
              <TouchableOpacity
                onPress={() => refetch()}
                style={styles.viewButton}
              >
                <Text style={styles.viewButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {!isLoading && !isError && (listings?.length || 0) === 0 && (
            <View style={styles.emptyState}>
              <Ionicons
                name="home-outline"
                size={48}
                color={colors.gray[600]}
              />
              <Text style={styles.emptyStateTitle}>No listings yet</Text>
              <Text style={styles.emptyStateSubtitle}>
                Create your first listing to start accepting applications
              </Text>
              <TouchableOpacity
                style={styles.viewButton}
                onPress={() => navigation.navigate("ListingWizard")}
                accessibilityLabel="Add your first listing"
                accessibilityRole="button"
              >
                <Text style={styles.viewButtonText}>
                  Add Your First Listing
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {(listings || []).map((listing) => (
            <View key={listing.id} style={styles.listingCard}>
              {/* Listing Image */}
              <Image
                source={{
                  uri:
                    listing.image ||
                    "https://via.placeholder.com/100x100/cccccc/666666?text=No+Image",
                }}
                style={styles.listingImage}
                accessibilityLabel={`Photo of ${listing.title}`}
              />

              {/* Listing Info */}
              <View style={styles.listingInfo}>
                <Text style={styles.listingTitle}>{listing.title}</Text>
                <Text style={styles.listingAddress} numberOfLines={1}>
                  {listing.address}
                </Text>
                <View style={styles.listingStats}>
                  <Ionicons
                    name="bed-outline"
                    size={14}
                    color={colors.primary[500]}
                  />
                  <Text style={styles.listingStatsText}>
                    {listing.availableBeds}/{listing.totalBeds} available
                  </Text>
                </View>
                <Text style={styles.lastUpdatedText}>
                  Updated {listing.lastUpdated}
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.listingActions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => {
                    navigation.navigate("EditListing", {
                      listingId: listing.id,
                      listingData: {
                        id: listing.id,
                        title: listing.title,
                        address: listing.address,
                        totalBeds: listing.totalBeds,
                        availableBeds: listing.availableBeds,
                        lastUpdated: listing.lastUpdated,
                      },
                    });
                  }}
                  accessibilityLabel="Edit listing"
                  accessibilityRole="button"
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.viewButton}
                  onPress={() => {
                    navigation.navigate("ProviderListingDetails", {
                      listingId: listing.id,
                    });
                  }}
                  accessibilityLabel="View listing"
                  accessibilityRole="button"
                >
                  <Text style={styles.viewButtonText}>View</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Recent Activity (simple) */}
          {(listings || []).length > 0 && (
            <View style={{ marginTop: spacing.lg }}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              {(listings || []).slice(0, 3).map((l) => (
                <View key={`activity-${l.id}`} style={styles.activityItem}>
                  <Ionicons
                    name="refresh-outline"
                    size={16}
                    color={colors.gray[400]}
                  />
                  <Text style={styles.activityText}>
                    Updated availability on {l.title}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[800],
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoutButton: {
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.gray[850],
    borderWidth: 1,
    borderColor: colors.gray[800],
  },
  welcomeText: {
    fontSize: typography.sizes.md,
    color: colors.gray[400],
    marginBottom: spacing.xs,
  },
  providerName: {
    fontSize: typography.sizes["2xl"],
    fontWeight: "700",
    color: colors.primary[500],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing["3xl"],
  },
  // Compact stats overview - Airbnb style
  statsOverview: {
    flexDirection: "row",
    backgroundColor: colors.gray[850],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray[800],
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    ...shadows.subtle,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.gray[800],
    marginHorizontal: spacing.sm,
  },
  statValue: {
    fontSize: typography.sizes["2xl"],
    fontWeight: "700",
    color: colors.primary[500],
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    color: colors.gray[400],
    textAlign: "center",
  },
  // Action cards - Airbnb style
  actionsGrid: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.gray[850],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray[800],
    padding: spacing.md,
    ...shadows.subtle,
  },
  primaryAction: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[600],
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: `${colors.gray[900]}15`,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  actionBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: colors.red,
    borderRadius: radius.full,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.gray[850],
  },
  actionBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.white,
  },
  actionContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  actionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.gray[50],
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.gray[400],
  },
  // Override text colors for primary action
  primaryActionText: {
    color: colors.gray[900],
  },
  listingsSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: "600",
    color: colors.gray[50],
    marginBottom: spacing.md,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing["3xl"],
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.gray[850],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray[800],
    marginBottom: spacing.md,
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
    marginBottom: spacing.lg,
  },
  listingCard: {
    flexDirection: "row",
    backgroundColor: colors.gray[850],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray[800],
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.subtle,
  },
  listingImage: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    backgroundColor: colors.gray[700],
  },
  listingInfo: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: "center",
  },
  listingTitle: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.gray[50],
    marginBottom: spacing.xs,
  },
  listingAddress: {
    fontSize: typography.sizes.sm,
    color: colors.gray[400],
    marginBottom: spacing.xs,
  },
  listingStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  listingStatsText: {
    fontSize: typography.sizes.sm,
    color: colors.primary[500],
    fontWeight: "500",
  },
  lastUpdatedText: {
    fontSize: typography.sizes.xs,
    color: colors.gray[500],
  },
  listingActions: {
    justifyContent: "center",
    gap: spacing.sm,
  },
  deleteIconButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.red,
    alignItems: "center",
    backgroundColor: `${colors.red}10`,
  },
  editButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary[500],
    alignItems: "center",
  },
  editButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.primary[500],
  },
  viewButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.primary[500],
    alignItems: "center",
  },
  viewButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.gray[900],
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.gray[850],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray[800],
    marginBottom: spacing.sm,
  },
  activityText: {
    fontSize: typography.sizes.sm,
    color: colors.gray[300],
    flex: 1,
  },
});
