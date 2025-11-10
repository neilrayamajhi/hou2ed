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
            "Previous:", lastUserRef.current,
            "Current:", user?.id
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
    }, [user?.id, user?.role, refetch]),
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
        {/* Metrics row */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Active Listings</Text>
            <Text style={styles.metricValue}>{(listings || []).length}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total Beds</Text>
            <Text style={styles.metricValue}>{totalBeds}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Available Today</Text>
            <Text style={styles.metricValue}>{totalAvailable}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Pending Apps</Text>
            <Text style={styles.metricValue}>{newApplications}</Text>
          </View>
        </View>
        {/* Three main tiles at the top */}
        <View style={styles.tilesContainer}>
          {/* Beds Available Tile */}
          <View style={[styles.tile, styles.bedsTile]}>
            <Ionicons
              name="bed-outline"
              size={32}
              color={colors.primary[500]}
            />
            <Text style={styles.tileNumber}>{totalAvailable}</Text>
            <Text style={styles.tileLabel}>Beds Available</Text>
          </View>

          {/* New Applications Tile */}
          <TouchableOpacity
            style={[styles.tile, styles.applicationsTile]}
            onPress={() => navigation.navigate("ApplicationsInbox")}
            accessibilityLabel="View new applications"
            accessibilityRole="button"
          >
            <View style={styles.badgeContainer}>
              <Ionicons
                name="document-text-outline"
                size={32}
                color={colors.primary[500]}
              />
              {newApplications > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{newApplications}</Text>
                </View>
              )}
            </View>
            <Text style={styles.tileNumber}>{newApplications}</Text>
            <Text style={styles.tileLabel}>New Applications</Text>
          </TouchableOpacity>

          {/* Create Listing via Wizard */}
          <TouchableOpacity
            style={[styles.tile, styles.addListingTile]}
            onPress={() => navigation.navigate("ListingWizard")}
            accessibilityLabel="Create listing (wizard)"
            accessibilityRole="button"
          >
            <Ionicons name="add-circle" size={32} color={colors.gray[900]} />
            <Text style={styles.addListingText}>Create Listing (Wizard)</Text>
          </TouchableOpacity>

          {/* Geocode Test Tile */}
          <TouchableOpacity
            style={[styles.tile, styles.applicationsTile]}
            onPress={() => navigation.navigate("GeoTest")}
            accessibilityLabel="Open Geocoding Test"
            accessibilityRole="button"
          >
            <Ionicons name="navigate-outline" size={32} color={colors.primary[500]} />
            <Text style={styles.tileNumber}>Test</Text>
            <Text style={styles.tileLabel}>Geocoding</Text>
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

        {/* Quick Actions Section */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate("AvailabilityUpdater")}
            accessibilityLabel="Update bed availability"
            accessibilityRole="button"
          >
            <Ionicons
              name="refresh-outline"
              size={24}
              color={colors.primary[500]}
            />
            <View style={styles.quickActionTextContainer}>
              <Text style={styles.quickActionTitle}>Update Availability</Text>
              <Text style={styles.quickActionSubtitle}>
                Keep bed counts current for seekers
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.gray[400]}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate("ApplicationsInbox")}
            accessibilityLabel="View all applications"
            accessibilityRole="button"
          >
            <Ionicons
              name="people-outline"
              size={24}
              color={colors.primary[500]}
            />
            <View style={styles.quickActionTextContainer}>
              <Text style={styles.quickActionTitle}>Manage Applications</Text>
              <Text style={styles.quickActionSubtitle}>
                Review and process applications
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.gray[400]}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => {
              // TODO: Will navigate to Analytics when it's built
              console.log("Analytics - Coming soon!");
            }}
            accessibilityLabel="View analytics"
            accessibilityRole="button"
          >
            <Ionicons
              name="analytics-outline"
              size={24}
              color={colors.primary[500]}
            />
            <View style={styles.quickActionTextContainer}>
              <Text style={styles.quickActionTitle}>Analytics</Text>
              <Text style={styles.quickActionSubtitle}>
                View performance metrics
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.gray[400]}
            />
          </TouchableOpacity>
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
  metricsRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.gray[850],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray[800],
    padding: spacing.md,
    alignItems: "center",
    ...shadows.subtle,
  },
  metricLabel: {
    fontSize: typography.sizes.xs,
    color: colors.gray[400],
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  metricValue: {
    fontSize: typography.sizes["2xl"],
    fontWeight: "700",
    color: colors.primary[500],
  },
  tilesContainer: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  tile: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    ...shadows.medium,
  },
  bedsTile: {
    backgroundColor: colors.gray[850],
    borderWidth: 1,
    borderColor: colors.primary[500],
  },
  applicationsTile: {
    backgroundColor: colors.gray[850],
    borderWidth: 1,
    borderColor: colors.primary[500],
  },
  addListingTile: {
    backgroundColor: colors.primary[500],
  },
  badgeContainer: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    backgroundColor: colors.red,
    borderRadius: radius.full,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
  },
  badgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.white,
  },
  tileNumber: {
    fontSize: typography.sizes["3xl"],
    fontWeight: "700",
    color: colors.primary[500],
    marginTop: spacing.sm,
  },
  tileLabel: {
    fontSize: typography.sizes.xs,
    color: colors.gray[400],
    textAlign: "center",
    marginTop: spacing.xs,
  },
  addListingText: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.gray[900],
    marginTop: spacing.sm,
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
  quickActionsSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  quickActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.gray[850],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray[800],
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  quickActionTextContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
  quickActionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.gray[50],
    marginBottom: spacing.xs,
  },
  quickActionSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.gray[400],
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
