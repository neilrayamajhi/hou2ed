import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Share,
  Dimensions,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography, radius } from "../../theme/tokens";
import { useSavedListings } from "../../hooks/useSavedItems";
import type { SavedListing } from "../../services/saved.service";
import ListingCard from "../../components/patterns/ListingCard";
import { RootStackNavigationProp } from "../../navigation/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const NUM_COLUMNS = 2;
const CARD_MARGIN = spacing.sm;
const CARD_WIDTH =
  (SCREEN_WIDTH - spacing.lg * 2 - CARD_MARGIN * (NUM_COLUMNS - 1)) /
  NUM_COLUMNS;

export default function SavedScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { savedListings, unsave, isUnsaving, isLoading } = useSavedListings();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const handleListingPress = useCallback(
    (listing: SavedListing) => {
      console.log("[SavedScreen] Navigating to listing:", {
        listing_id: listing.listing_id,
        nested_listing_id: listing.listing?.id,
        full_object: JSON.stringify(listing, null, 2),
      });

      // Use listing.listing_id first, fallback to nested listing.id
      const listingId = listing.listing_id || listing.listing?.id;

      if (!listingId) {
        console.error("[SavedScreen] No listing ID found!", listing);
        Alert.alert("Error", "Cannot open listing - invalid data");
        return;
      }

      navigation.navigate("ListingDetails", { listingId });
    },
    [navigation],
  );

  const handleListingLongPress = useCallback(
    async (listing: SavedListing) => {
      console.log("[SavedScreen] Attempting to unsave:", {
        listing_id: listing.listing_id,
        nested_listing_id: listing.listing?.id,
        id: listing.id,
        has_listing: !!listing.listing,
        full_object: JSON.stringify(listing, null, 2),
      });

      // Use listing.listing_id first, fallback to nested listing.id
      const listingId = listing.listing_id || listing.listing?.id;

      if (!listingId) {
        console.error("[SavedScreen] No listing ID found for unsave!", listing);
        Alert.alert("Error", "Cannot remove listing - invalid data");
        return;
      }

      const listingTitle = listing.listing?.title || "this listing";
      Alert.alert(
        "Remove from Saved?",
        `Remove "${listingTitle}" from your saved listings?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              try {
                console.log("[SavedScreen] Calling unsave with:", listingId);
                await unsave(listingId);
                Alert.alert(
                  "Removed",
                  "Listing has been removed from your saved items",
                );
              } catch (error) {
                console.error("[SavedScreen] Unsave error:", error);
                Alert.alert("Error", "Failed to remove listing");
              }
            },
          },
        ],
      );
    },
    [unsave],
  );

  const handleShare = useCallback(async (listing: SavedListing) => {
    if (!listing.listing) return;

    // Use listing.listing_id first, fallback to nested listing.id
    const listingId = listing.listing_id || listing.listing?.id;

    if (!listingId) {
      Alert.alert("Error", "Cannot share listing - invalid data");
      return;
    }

    try {
      const listingData = listing.listing;
      const title = listingData.title || "Housing Listing";
      const address =
        `${listingData.address || ""}, ${listingData.city || ""}, ${listingData.state || ""}`.trim();

      const message = `Check out this listing on HOU2ED:\n\n${title}\n${address}\n\nView more at: hou2ed://listing/${listingId}`;

      const result = await Share.share({
        message,
        title,
      });

      if (result.action === Share.sharedAction) {
        console.log("Shared successfully");
      }
    } catch (error) {
      Alert.alert("Error", "Unable to share listing");
    }
  }, []);

  const renderListing = useCallback(
    ({ item }: { item: SavedListing }) => {
      if (!item.listing) return null;

      const listingData = item.listing;
      const title = listingData.title || "Housing Listing";
      const address =
        `${listingData.city || ""}, ${listingData.state || ""}`.trim();

      return (
        <Pressable
          style={styles.cardContainer}
          onPress={() => handleListingPress(item)}
          onLongPress={() => handleListingLongPress(item)}
          delayLongPress={500}
        >
          <View style={styles.card}>
            <View style={styles.imageContainer}>
              <View style={styles.imagePlaceholder}>
                <Ionicons
                  name="image-outline"
                  size={40}
                  color={colors.gray[400]}
                />
              </View>

              <TouchableOpacity
                style={styles.shareButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleShare(item);
                }}
                accessibilityLabel="Share listing"
                accessibilityRole="button"
              >
                <Ionicons name="share-outline" size={20} color={colors.white} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.savedIndicator}
                onPress={(e) => {
                  e.stopPropagation();
                  handleListingLongPress(item);
                }}
                accessibilityLabel="Remove from saved"
                accessibilityRole="button"
              >
                <Ionicons
                  name="bookmark"
                  size={20}
                  color={colors.primary[500]}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.cardContent}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              <Text style={styles.address} numberOfLines={1}>
                {address}
              </Text>

              <View style={styles.availabilityRow}>
                <Text style={styles.availabilityText}>
                  Saved {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>
        </Pressable>
      );
    },
    [handleListingPress, handleListingLongPress, handleShare],
  );

  const keyExtractor = useCallback((item: SavedListing) => item.id, []);

  const EmptyComponent = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Ionicons name="bookmark-outline" size={64} color={colors.gray[400]} />
        <Text style={styles.emptyTitle}>No Saved Listings</Text>
        <Text style={styles.emptySubtitle}>
          Listings you save will appear here for easy access
        </Text>
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => navigation.navigate("Home" as any)}
        >
          <Text style={styles.browseButtonText}>Browse Listings</Text>
        </TouchableOpacity>
      </View>
    ),
    [navigation],
  );

  const ListHeader = useCallback(
    () => (
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Saved Listings</Text>
        <Text style={styles.headerSubtitle}>
          {savedListings.length} listing
          {savedListings.length !== 1 ? "s" : ""} saved
        </Text>
      </View>
    ),
    [savedListings.length],
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.emptyContainer, { paddingTop: 100 }]}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={[styles.emptySubtitle, { marginTop: spacing.lg }]}>
            Loading saved listings...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={savedListings}
        renderItem={renderListing}
        keyExtractor={keyExtractor}
        numColumns={NUM_COLUMNS}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={EmptyComponent}
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: typography.sizes["2xl"],
    fontWeight: "700",
    color: colors.gray[50],
  },
  headerSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.gray[400],
    marginTop: spacing.xs,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: CARD_MARGIN,
  },
  cardContainer: {
    width: CARD_WIDTH,
  },
  card: {
    backgroundColor: colors.gray[850],
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  imageContainer: {
    height: CARD_WIDTH * 0.75,
    backgroundColor: colors.gray[800],
    position: "relative",
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  shareButton: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: radius.full,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  savedIndicator: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: radius.full,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: {
    padding: spacing.md,
  },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.gray[50],
    marginBottom: spacing.xs,
  },
  address: {
    fontSize: typography.sizes.sm,
    color: colors.gray[400],
    marginBottom: spacing.sm,
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  price: {
    fontSize: typography.sizes.lg,
    fontWeight: "700",
    color: colors.primary[400],
  },
  specsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  spec: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  specText: {
    fontSize: typography.sizes.sm,
    color: colors.gray[300],
  },
  availabilityRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray[800],
  },
  availabilityText: {
    fontSize: typography.sizes.xs,
    color: colors.green,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl * 4,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: "600",
    color: colors.gray[50],
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.gray[400],
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  browseButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  browseButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.gray[900],
  },
});
