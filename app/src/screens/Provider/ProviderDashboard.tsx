import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Dimensions,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { RootStackNavigationProp } from "../../navigation/types";
import { useProviderListings } from "../../hooks/useProviderListings";
import { ActivityIndicator, RefreshControl } from "react-native";
import { useToast } from "../../components/ui/Toast";
import { useRequireProvider } from "../../hooks/useRequireProvider";
import { useAuthStore } from "../../state/useAuthStore";

const { width: screenWidth } = Dimensions.get("window");

export default function ProviderDashboard() {
  const navigation = useNavigation<RootStackNavigationProp>();
  useRequireProvider();
  const user = useAuthStore((state) => state.user);
  const { data: listings, isLoading, isError, refetch, isRefetching } = useProviderListings();
  const { showToast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState<"week" | "month" | "year">("month");

  // Calculate metrics
  const totalBeds = (listings || []).reduce((sum, l) => sum + (l.totalBeds || 0), 0);
  const totalAvailable = (listings || []).reduce(
    (sum, l) => sum + (l.availableBeds || 0),
    0,
  );
  const occupancyRate = totalBeds > 0 ? Math.round(((totalBeds - totalAvailable) / totalBeds) * 100) : 0;
  const newApplications = 12; // Mock data
  const revenue = 45280; // Mock monthly revenue
  const rating = 4.8; // Mock rating

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={!!isRefetching}
            onRefresh={() => refetch()}
            tintColor="#FF5A5F"
          />
        }
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={styles.userName}>{user?.fullName || "Provider"}</Text>
            </View>
            <TouchableOpacity style={styles.notificationButton}>
              <View style={styles.notificationIconContainer}>
                <Ionicons name="notifications-outline" size={24} color="#222" />
                {newApplications > 0 && <View style={styles.notificationDot} />}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Performance Overview Card */}
        <View style={styles.performanceCard}>
          <View style={styles.performanceHeader}>
            <Text style={styles.performanceTitle}>Performance Overview</Text>
            <View style={styles.periodSelector}>
              {(["week", "month", "year"] as const).map((period) => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.periodButton,
                    selectedPeriod === period && styles.periodButtonActive,
                  ]}
                  onPress={() => setSelectedPeriod(period)}
                >
                  <Text
                    style={[
                      styles.periodButtonText,
                      selectedPeriod === period && styles.periodButtonTextActive,
                    ]}
                  >
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Key Metrics Grid */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <View style={styles.metricIconContainer}>
                <MaterialCommunityIcons name="cash" size={20} color="#00A699" />
              </View>
              <Text style={styles.metricValue}>${revenue.toLocaleString()}</Text>
              <Text style={styles.metricLabel}>Revenue</Text>
              <View style={styles.metricChange}>
                <Ionicons name="trending-up" size={14} color="#00A699" />
                <Text style={styles.metricChangeText}>+12%</Text>
              </View>
            </View>

            <View style={styles.metricItem}>
              <View style={styles.metricIconContainer}>
                <Ionicons name="bed-outline" size={20} color="#FF5A5F" />
              </View>
              <Text style={styles.metricValue}>{occupancyRate}%</Text>
              <Text style={styles.metricLabel}>Occupancy</Text>
              <View style={styles.metricChange}>
                <Ionicons name="trending-up" size={14} color="#00A699" />
                <Text style={styles.metricChangeText}>+5%</Text>
              </View>
            </View>

            <View style={styles.metricItem}>
              <View style={styles.metricIconContainer}>
                <Ionicons name="star" size={20} color="#FFB400" />
              </View>
              <Text style={styles.metricValue}>{rating}</Text>
              <Text style={styles.metricLabel}>Rating</Text>
              <View style={styles.metricChange}>
                <Text style={styles.metricChangeTextNeutral}>23 reviews</Text>
              </View>
            </View>

            <View style={styles.metricItem}>
              <View style={styles.metricIconContainer}>
                <Ionicons name="people-outline" size={20} color="#7B61FF" />
              </View>
              <Text style={styles.metricValue}>{newApplications}</Text>
              <Text style={styles.metricLabel}>New Apps</Text>
              <View style={styles.metricChange}>
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>NEW</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickActionsContent}
          >
            <TouchableOpacity
              style={[styles.quickActionCard, styles.quickActionPrimary]}
              onPress={() => navigation.navigate("ListingWizard")}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name="add-circle" size={28} color="#FFF" />
              </View>
              <Text style={styles.quickActionTextPrimary}>Add Listing</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate("AvailabilityUpdater")}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name="calendar-outline" size={28} color="#FF5A5F" />
              </View>
              <Text style={styles.quickActionText}>Update Availability</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => showToast("Applications coming soon!", "info")}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name="document-text-outline" size={28} color="#FF5A5F" />
              </View>
              <Text style={styles.quickActionText}>Applications</Text>
              {newApplications > 0 && (
                <View style={styles.quickActionBadge}>
                  <Text style={styles.quickActionBadgeText}>{newApplications}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => showToast("Messages coming soon!", "info")}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name="chatbubbles-outline" size={28} color="#FF5A5F" />
              </View>
              <Text style={styles.quickActionText}>Messages</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Listings Section */}
        <View style={styles.listingsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Listings</Text>
            <TouchableOpacity onPress={() => navigation.navigate("ListingWizard")}>
              <Text style={styles.seeAllText}>Add new</Text>
            </TouchableOpacity>
          </View>

          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF5A5F" />
            </View>
          )}

          {isError && (
            <View style={styles.emptyStateCard}>
              <Ionicons name="alert-circle-outline" size={48} color="#717171" />
              <Text style={styles.emptyStateTitle}>Failed to load listings</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {!isLoading && !isError && (!listings || listings.length === 0) ? (
            <View style={styles.emptyStateCard}>
              <Ionicons name="home-outline" size={48} color="#717171" />
              <Text style={styles.emptyStateTitle}>No listings yet</Text>
              <Text style={styles.emptyStateSubtitle}>
                Start hosting by adding your first property
              </Text>
              <TouchableOpacity
                style={styles.addFirstListingButton}
                onPress={() => navigation.navigate("ListingWizard")}
              >
                <Text style={styles.addFirstListingButtonText}>Add your first listing</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.listingsScrollContent}
            >
              {(listings || []).map((listing) => (
                <TouchableOpacity
                  key={listing.id}
                  style={styles.listingCard}
                  onPress={() =>
                    navigation.navigate("ProviderListingDetails", { listingId: listing.id })
                  }
                  activeOpacity={0.9}
                >
                  <Image
                    source={{ uri: listing.image || "https://via.placeholder.com/300x200" }}
                    style={styles.listingImage}
                  />
                  <View style={styles.listingContent}>
                    <View style={styles.listingHeader}>
                      <View style={styles.listingBadge}>
                        <Text style={styles.listingBadgeText}>
                          {listing.availableBeds} beds available
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.listingMenuButton}
                        onPress={() =>
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
                          })
                        }
                      >
                        <Ionicons name="ellipsis-horizontal" size={20} color="#717171" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.listingTitle} numberOfLines={1}>
                      {listing.title}
                    </Text>
                    <Text style={styles.listingAddress} numberOfLines={1}>
                      {listing.address}
                    </Text>
                    <View style={styles.listingFooter}>
                      <View style={styles.listingStats}>
                        <Ionicons name="bed-outline" size={14} color="#717171" />
                        <Text style={styles.listingStatsText}>
                          {listing.totalBeds} total beds
                        </Text>
                      </View>
                      <Text style={styles.listingUpdated}>Updated {listing.lastUpdated}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Recent Activity */}
        <View style={styles.activitySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.activityList}>
            <View style={styles.activityItem}>
              <View style={[styles.activityIcon, { backgroundColor: "#E6F7F6" }]}>
                <Ionicons name="checkmark-circle" size={20} color="#00A699" />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>Application approved</Text>
                <Text style={styles.activitySubtitle}>John Doe for Downtown Shelter</Text>
                <Text style={styles.activityTime}>2 hours ago</Text>
              </View>
            </View>

            <View style={styles.activityItem}>
              <View style={[styles.activityIcon, { backgroundColor: "#FFF0E6" }]}>
                <Ionicons name="document-text" size={20} color="#FFB400" />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>New application received</Text>
                <Text style={styles.activitySubtitle}>5 applications for Westside Haven</Text>
                <Text style={styles.activityTime}>5 hours ago</Text>
              </View>
            </View>

            <View style={styles.activityItem}>
              <View style={[styles.activityIcon, { backgroundColor: "#FFE8E8" }]}>
                <Ionicons name="trending-up" size={20} color="#FF5A5F" />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>Occupancy increased</Text>
                <Text style={styles.activitySubtitle}>Now at 85% capacity</Text>
                <Text style={styles.activityTime}>1 day ago</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Resources Section */}
        <View style={styles.resourcesSection}>
          <Text style={styles.sectionTitle}>Resources</Text>
          <View style={styles.resourcesGrid}>
            <TouchableOpacity style={styles.resourceCard}>
              <Ionicons name="book-outline" size={24} color="#222" />
              <Text style={styles.resourceTitle}>Provider Guide</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resourceCard}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#222" />
              <Text style={styles.resourceTitle}>Safety Center</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resourceCard}>
              <Ionicons name="help-circle-outline" size={24} color="#222" />
              <Text style={styles.resourceTitle}>Get Help</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resourceCard}>
              <Ionicons name="stats-chart-outline" size={24} color="#222" />
              <Text style={styles.resourceTitle}>Analytics</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 10 : 0,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: {
    fontSize: 14,
    color: "#717171",
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: "600",
    color: "#222222",
  },
  notificationButton: {
    padding: 8,
  },
  notificationIconContainer: {
    position: "relative",
  },
  notificationDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF5A5F",
  },
  performanceCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 20,
    backgroundColor: "#F7F7F7",
    borderRadius: 12,
  },
  performanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  performanceTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#222222",
  },
  periodSelector: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 2,
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  periodButtonActive: {
    backgroundColor: "#222222",
  },
  periodButtonText: {
    fontSize: 12,
    color: "#717171",
    fontWeight: "500",
  },
  periodButtonTextActive: {
    color: "#FFFFFF",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -8,
  },
  metricItem: {
    width: "50%",
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  metricIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "600",
    color: "#222222",
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: "#717171",
    marginBottom: 4,
  },
  metricChange: {
    flexDirection: "row",
    alignItems: "center",
  },
  metricChangeText: {
    fontSize: 12,
    color: "#00A699",
    marginLeft: 4,
    fontWeight: "500",
  },
  metricChangeTextNeutral: {
    fontSize: 12,
    color: "#717171",
  },
  newBadge: {
    backgroundColor: "#FF5A5F",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    fontSize: 10,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  quickActionsContainer: {
    marginBottom: 24,
  },
  quickActionsContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  quickActionCard: {
    width: 100,
    height: 100,
    backgroundColor: "#F7F7F7",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    position: "relative",
  },
  quickActionPrimary: {
    backgroundColor: "#FF5A5F",
  },
  quickActionIcon: {
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: "#222222",
    fontWeight: "500",
    textAlign: "center",
  },
  quickActionTextPrimary: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  quickActionBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#FF5A5F",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  quickActionBadgeText: {
    fontSize: 10,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  listingsSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#222222",
  },
  seeAllText: {
    fontSize: 14,
    color: "#FF5A5F",
    fontWeight: "500",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyStateCard: {
    marginHorizontal: 20,
    padding: 40,
    backgroundColor: "#F7F7F7",
    borderRadius: 12,
    alignItems: "center",
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222222",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: "#717171",
    textAlign: "center",
    marginBottom: 20,
  },
  addFirstListingButton: {
    backgroundColor: "#FF5A5F",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFirstListingButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DDD",
  },
  retryButtonText: {
    color: "#222",
    fontSize: 14,
    fontWeight: "500",
  },
  listingsScrollContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  listingCard: {
    width: screenWidth * 0.75,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  listingImage: {
    width: "100%",
    height: 160,
    backgroundColor: "#F7F7F7",
  },
  listingContent: {
    padding: 16,
  },
  listingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  listingBadge: {
    backgroundColor: "#E6F7F6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  listingBadgeText: {
    fontSize: 12,
    color: "#00A699",
    fontWeight: "500",
  },
  listingMenuButton: {
    padding: 4,
  },
  listingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222222",
    marginBottom: 4,
  },
  listingAddress: {
    fontSize: 14,
    color: "#717171",
    marginBottom: 12,
  },
  listingFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listingStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  listingStatsText: {
    fontSize: 12,
    color: "#717171",
  },
  listingUpdated: {
    fontSize: 12,
    color: "#B0B0B0",
  },
  activitySection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  activityList: {
    backgroundColor: "#F7F7F7",
    borderRadius: 12,
    padding: 16,
  },
  activityItem: {
    flexDirection: "row",
    marginBottom: 16,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#222222",
    marginBottom: 2,
  },
  activitySubtitle: {
    fontSize: 13,
    color: "#717171",
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: "#B0B0B0",
  },
  resourcesSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  resourcesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 16,
    marginHorizontal: -8,
  },
  resourceCard: {
    width: "50%",
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  resourceTitle: {
    fontSize: 14,
    color: "#222222",
    marginTop: 8,
    fontWeight: "500",
  },
  metricsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#F7F7F7",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
});