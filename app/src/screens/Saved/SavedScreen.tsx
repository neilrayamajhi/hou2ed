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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography, radius } from "../../theme/tokens";
import useSavedStore, { SavedListing } from "../../state/useSavedStore";
import ListingCard from "../../components/patterns/ListingCard";
import { RootStackNavigationProp } from "../../navigation/types";
import { useI18n } from "../../i18n";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const NUM_COLUMNS = 2;
const CARD_MARGIN = spacing.sm;
const CARD_WIDTH =
  (SCREEN_WIDTH - spacing.lg * 2 - CARD_MARGIN * (NUM_COLUMNS - 1)) /
  NUM_COLUMNS;

// Mock saved listings for demonstration
const mockSavedListings: SavedListing[] = [
  {
    id: "1",
    title: "Sunset View Apartments",
    address: "123 Main St, San Francisco, CA",
    rent: 2500,
    bedrooms: 2,
    bathrooms: 2,
    sqft: 1200,
    imageUrl: "https://picsum.photos/400/300?random=1",
    savedAt: new Date(Date.now() - 86400000),
    availableUnits: 3,
    propertyType: "Apartment",
  },
  {
    id: "2",
    title: "Green Valley Homes",
    address: "456 Oak Ave, Oakland, CA",
    rent: 3200,
    bedrooms: 3,
    bathrooms: 2.5,
    sqft: 1800,
    imageUrl: "https://picsum.photos/400/300?random=2",
    savedAt: new Date(Date.now() - 172800000),
    availableUnits: 1,
    propertyType: "House",
  },
  {
    id: "3",
    title: "Downtown Lofts",
    address: "789 Market St, San Francisco, CA",
    rent: 3800,
    bedrooms: 1,
    bathrooms: 1,
    sqft: 850,
    imageUrl: "https://picsum.photos/400/300?random=3",
    savedAt: new Date(Date.now() - 259200000),
    propertyType: "Loft",
  },
  {
    id: "4",
    title: "Riverside Commons",
    address: "321 River Rd, Berkeley, CA",
    rent: 2100,
    bedrooms: 2,
    bathrooms: 1,
    sqft: 950,
    imageUrl: "https://picsum.photos/400/300?random=4",
    savedAt: new Date(Date.now() - 345600000),
    availableUnits: 5,
    propertyType: "Apartment",
  },
  {
    id: "5",
    title: "Oak Park Residences",
    address: "654 Park Blvd, Alameda, CA",
    rent: 2800,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1400,
    imageUrl: "https://picsum.photos/400/300?random=5",
    savedAt: new Date(Date.now() - 432000000),
    availableUnits: 2,
    propertyType: "Townhouse",
  },
  {
    id: "6",
    title: "Marina Bay Suites",
    address: "987 Marina Dr, San Francisco, CA",
    rent: 4500,
    bedrooms: 2,
    bathrooms: 2,
    sqft: 1300,
    imageUrl: "https://picsum.photos/400/300?random=6",
    savedAt: new Date(Date.now() - 518400000),
    propertyType: "Condo",
  },
];

export default function SavedScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { savedListings, removeListing } = useSavedStore();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const i18n = useI18n();

  // Use mock data if store is empty
  const displayListings =
    savedListings.length > 0 ? savedListings : mockSavedListings;

  const handleListingPress = useCallback(
    (listing: SavedListing) => {
      navigation.navigate("ListingDetails", { listingId: listing.id });
    },
    [navigation],
  );

  const handleListingLongPress = useCallback(
    (listing: SavedListing) => {
      Alert.alert(
        i18n.t("saved.remove"),
        i18n.t("saved.removeConfirm", { title: listing.title }),
        [
          {
            text: i18n.t("common.cancel"),
            style: "cancel",
          },
          {
            text: i18n.t("common.delete"),
            style: "destructive",
            onPress: () => {
              removeListing(listing.id);
              Alert.alert(
                i18n.t("saved.removed"),
                i18n.t("saved.removedSuccess"),
              );
            },
          },
        ],
      );
    },
    [removeListing, i18n],
  );

  const handleShare = useCallback(
    async (listing: SavedListing) => {
      try {
        const message = `Check out this listing on HOU2ED:\n\n${listing.title}\n${listing.address}\n$${listing.rent}/month\n${listing.bedrooms} bed, ${listing.bathrooms} bath\n\nView more at: hou2ed://listing/${listing.id}`;

        const result = await Share.share({
          message,
          title: listing.title,
        });

        if (result.action === Share.sharedAction) {
          console.log("Shared successfully");
        }
      } catch (error) {
        Alert.alert(i18n.t("common.error"), i18n.t("saved.shareError"));
      }
    },
    [i18n],
  );

  const renderListingSpecs = useCallback(
    (item: SavedListing) => (
      <View style={styles.specsRow}>
        <View style={styles.spec}>
          <Ionicons name="bed-outline" size={14} color={colors.gray[400]} />
          <Text style={styles.specText}>{item.bedrooms}</Text>
        </View>
        <View style={styles.spec}>
          <Ionicons name="water-outline" size={14} color={colors.gray[400]} />
          <Text style={styles.specText}>{item.bathrooms}</Text>
        </View>
        <View style={styles.spec}>
          <Ionicons name="resize-outline" size={14} color={colors.gray[400]} />
          <Text style={styles.specText}>{item.sqft} ft²</Text>
        </View>
      </View>
    ),
    [],
  );

  const renderListing = useCallback(
    ({ item }: { item: SavedListing }) => {
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
                {item.title}
              </Text>
              <Text style={styles.address} numberOfLines={1}>
                {item.address}
              </Text>

              <View style={styles.detailsRow}>
                <Text style={styles.price}>${item.rent}/mo</Text>
              </View>

              {renderListingSpecs(item)}

              {item.availableUnits && (
                <View style={styles.availabilityRow}>
                  <Text style={styles.availabilityText}>
                    {item.availableUnits}{" "}
                    {item.availableUnits === 1
                      ? i18n.t("saved.unit")
                      : i18n.t("saved.units")}{" "}
                    {i18n.t("saved.available")}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Pressable>
      );
    },
    [
      handleListingPress,
      handleListingLongPress,
      handleShare,
      renderListingSpecs,
      i18n,
    ],
  );

  const keyExtractor = useCallback((item: SavedListing) => item.id, []);

  const EmptyComponent = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Ionicons name="bookmark-outline" size={64} color={colors.gray[400]} />
        <Text style={styles.emptyTitle}>{i18n.t("saved.empty")}</Text>
        <Text style={styles.emptySubtitle}>{i18n.t("saved.emptyDesc")}</Text>
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => navigation.navigate("Search" as any)}
        >
          <Text style={styles.browseButtonText}>{i18n.t("saved.browse")}</Text>
        </TouchableOpacity>
      </View>
    ),
    [navigation, i18n],
  );

  const ListHeader = useCallback(
    () => (
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{i18n.t("saved.title")}</Text>
        <Text style={styles.headerSubtitle}>
          {displayListings.length}{" "}
          {displayListings.length === 1
            ? i18n.t("saved.listing")
            : i18n.t("saved.listings")}{" "}
          {i18n.t("saved.saved")}
        </Text>
      </View>
    ),
    [displayListings.length, i18n],
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={displayListings}
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
