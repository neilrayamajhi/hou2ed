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
  getListingForAdmin,
  setListingActive,
} from "../../services/listingModeration.service";

type ListingModerationDetailRouteProp = RouteProp<
  { ListingModerationDetail: { listingId: string } },
  "ListingModerationDetail"
>;

export default function ListingModerationDetail() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<ListingModerationDetailRouteProp>();
  const queryClient = useQueryClient();
  const { listingId } = route.params;

  const {
    data: listing,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["adminListingDetail", listingId],
    queryFn: () => getListingForAdmin(listingId),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (isActive: boolean) => setListingActive(listingId, isActive),
    onSuccess: async (result) => {
      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: ["adminListings"] });
        await queryClient.invalidateQueries({
          queryKey: ["adminListingDetail", listingId],
        });
      } else {
        Alert.alert("Error", result.error || "Failed to update listing");
      }
    },
  });

  const handleToggleActive = () => {
    if (!listing) return;
    if (listing.isActive) {
      Alert.alert(
        "Deactivate Listing",
        `Remove "${listing.title}" from public view? Providers can be told to fix issues before reactivating.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Deactivate",
            style: "destructive",
            onPress: () => toggleActiveMutation.mutate(false),
          },
        ],
      );
    } else {
      Alert.alert("Reactivate Listing", `Make "${listing.title}" visible again?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Reactivate", onPress: () => toggleActiveMutation.mutate(true) },
      ]);
    }
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
        <Text style={styles.headerTitle}>Listing Detail</Text>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : isError || !listing ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.red} />
          <Text style={styles.errorText}>Failed to load listing</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <Text style={styles.title}>{listing.title}</Text>
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.badge,
                  listing.isActive ? styles.activeBadge : styles.inactiveBadge,
                ]}
              >
                <Text style={styles.badgeText}>
                  {listing.isActive ? "Active" : "Inactive"}
                </Text>
              </View>
              {listing.verified && (
                <View style={[styles.badge, styles.verifiedBadge]}>
                  <Text style={styles.badgeText}>Verified</Text>
                </View>
              )}
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={16} color={colors.gray[400]} />
              <Text style={styles.detailText}>
                {[listing.address, listing.city, listing.state, listing.zipCode]
                  .filter(Boolean)
                  .join(", ")}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="home-outline" size={16} color={colors.gray[400]} />
              <Text style={styles.detailText}>{listing.housingType}</Text>
            </View>

            {listing.description && (
              <Text style={styles.description}>{listing.description}</Text>
            )}
          </View>

          <Text style={styles.sectionTitle}>Moderation</Text>
          <TouchableOpacity
            style={[
              styles.actionButton,
              listing.isActive && styles.destructiveButton,
            ]}
            disabled={toggleActiveMutation.isPending}
            onPress={handleToggleActive}
          >
            <Text style={styles.actionButtonText}>
              {listing.isActive ? "Deactivate Listing" : "Reactivate Listing"}
            </Text>
          </TouchableOpacity>
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
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: "700",
    color: colors.gray[50],
    marginBottom: spacing.sm,
  },
  badgeRow: { flexDirection: "row", gap: spacing.xs, marginBottom: spacing.md },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm },
  activeBadge: { backgroundColor: colors.green },
  inactiveBadge: { backgroundColor: colors.gray[600] },
  verifiedBadge: { backgroundColor: colors.primary[500] },
  badgeText: { fontSize: typography.sizes.xs, fontWeight: "600", color: colors.white },
  detailRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xs },
  detailText: { fontSize: typography.sizes.sm, color: colors.gray[300], flex: 1 },
  description: {
    fontSize: typography.sizes.sm,
    color: colors.gray[400],
    marginTop: spacing.md,
    lineHeight: 20,
  },
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
  },
  destructiveButton: { backgroundColor: colors.red, borderColor: colors.red },
  actionButtonText: { fontSize: typography.sizes.md, fontWeight: "600", color: colors.white },
});
