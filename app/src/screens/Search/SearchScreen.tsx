import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MapView, Marker, PROVIDER_GOOGLE } from "../../components/MapView";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { theme } from "../../theme";
import ListingCard from "../../components/ListingCard";
import EmptyState from "../../components/EmptyState";
import OfflineBanner from "../../components/OfflineBanner";
import FiltersSheet from "./FiltersSheet";
import { useFilterStore } from "../../state/useFilterStore";
import {
  generateMockListings,
  filterListingsByQuick,
} from "../../data/mockListings";
import { sortListings, SORT_OPTIONS } from "../../utils/sortListings";
import { usePerformance } from "../../utils/perf";
import type { Listing } from "../../types/listing";
import type { SortOption } from "../../types/filters";

type ViewMode = "list" | "map";

const MAP_DARK_STYLE = [
  {
    elementType: "geometry",
    stylers: [{ color: "#212121" }],
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#757575" }],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#212121" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#2c2c2c" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#000000" }],
  },
];

export default function SearchScreen() {
  const navigation = useNavigation();

  // Store state
  const {
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    quickFilters,
    clearAll,
    hasActiveFilters,
    getActiveFilterCount,
  } = useFilterStore();

  // Local state
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchText, setSearchText] = useState(searchQuery);
  const [showSortModal, setShowSortModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);

  // Performance tracking
  const searchPerf = usePerformance("search");
  const mapPerf = usePerformance("mapUpdate");

  // Monitor network connectivity (disabled for web)
  useEffect(() => {
    // NetInfo not available on web, default to online
    setIsOffline(false);
  }, []);

  // Load and filter listings
  useEffect(() => {
    searchPerf.start();

    const allListings = generateMockListings(30);
    let filtered = filterListingsByQuick(allListings, quickFilters);

    // Apply search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.name.toLowerCase().includes(query) ||
          l.description.toLowerCase().includes(query) ||
          l.address.city.toLowerCase().includes(query) ||
          l.provider.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    const sorted = sortListings(filtered, sortBy);
    setListings(sorted);

    searchPerf.end();
  }, [quickFilters, searchQuery, sortBy]); // Removed searchPerf from dependencies

  // Handle search
  const handleSearch = useCallback(() => {
    setSearchQuery(searchText);
  }, [searchText, setSearchQuery]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // In real app, this would fetch new data
    setIsRefreshing(false);
  }, []);

  // Open filters
  const openFilters = useCallback(() => {
    setShowFilters(true);
  }, []);

  // Open details
  const openDetails = useCallback((listing: Listing) => {
    console.log("Open details:", listing.id);
    // @ts-ignore - Navigation types will be updated
    navigation.navigate("ListingDetails", { listingId: listing.id, listing });
  }, [navigation]);

  // Render listing item
  const renderListingItem = useCallback(
    ({ item }: { item: Listing }) => (
      <View style={styles.listItemContainer}>
        <ListingCard listing={item} onPress={() => openDetails(item)} />
      </View>
    ),
    [openDetails]
  );

  // List key extractor
  const keyExtractor = useCallback((item: Listing) => item.id, []);

  // Filter count text
  const filterCountText = useMemo(() => {
    const count = getActiveFilterCount();
    if (count === 0) return "";
    return ` (${count})`;
  }, [getActiveFilterCount]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons
            name="search-outline"
            size={20}
            color={"#4B5563"}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search location or shelter..."
            placeholderTextColor={"#4B5563"}
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity onPress={openFilters} style={styles.filterButton}>
            <Ionicons name="options-outline" size={20} color={"#D4AF37"} />
            <Text style={styles.filterButtonText}>Filters{filterCountText}</Text>
          </TouchableOpacity>
        </View>

        {/* Controls Row */}
        <View style={styles.controlsRow}>
          {/* View Mode Toggle */}
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                viewMode === "map" && styles.toggleButtonActive,
              ]}
              onPress={() => setViewMode("map")}
            >
              <Ionicons
                name="map-outline"
                size={18}
                color={viewMode === "map" ? "#000000" : "#FFFFFF"}
              />
              <Text
                style={[
                  styles.toggleText,
                  viewMode === "map" && styles.toggleTextActive,
                ]}
              >
                Map
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                viewMode === "list" && styles.toggleButtonActive,
              ]}
              onPress={() => setViewMode("list")}
            >
              <Ionicons
                name="list-outline"
                size={18}
                color={viewMode === "list" ? "#000000" : "#FFFFFF"}
              />
              <Text
                style={[
                  styles.toggleText,
                  viewMode === "list" && styles.toggleTextActive,
                ]}
              >
                List
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sort Dropdown */}
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setShowSortModal(true)}
          >
            <Ionicons
              name="swap-vertical-outline"
              size={18}
              color={"#FFFFFF"}
            />
            <Text style={styles.sortText}>
              {SORT_OPTIONS.find((o) => o.value === sortBy)?.label || "Sort"}
            </Text>
            <Ionicons
              name="chevron-down-outline"
              size={16}
              color={"#4B5563"}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Offline Banner */}
      <OfflineBanner visible={isOffline} />

      {/* Results Count */}
      <View style={styles.resultsCount}>
        <Text style={styles.resultsText}>
          {listings.length} {listings.length === 1 ? "place" : "places"} found
        </Text>
      </View>

      {/* Content */}
      {listings.length === 0 ? (
        <EmptyState
          message="No matches found"
          subMessage="Try adjusting your filters or expanding your search area"
          onClearFilters={hasActiveFilters() ? clearAll : undefined}
          showClearButton={hasActiveFilters()}
        />
      ) : viewMode === "list" ? (
        <FlatList
          data={listings}
          renderItem={renderListingItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={"#D4AF37"}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            customMapStyle={MAP_DARK_STYLE}
            initialRegion={{
              latitude: 37.7749,
              longitude: -122.4194,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            }}
            showsUserLocation
            showsMyLocationButton
          >
            {listings.map((listing) => (
              <Marker
                key={listing.id}
                coordinate={listing.coordinates}
                onPress={() => openDetails(listing)}
              >
                <View
                  style={[
                    styles.marker,
                    listing.availability === "available"
                      ? styles.markerAvailable
                      : styles.markerFull,
                  ]}
                >
                  <Text style={styles.markerText}>
                    {listing.price.isFree ? "FREE" : `$${listing.price.min}`}
                  </Text>
                </View>
              </Marker>
            ))}
          </MapView>
        </View>
      )}

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSortModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sort By</Text>
              <TouchableOpacity onPress={() => setShowSortModal(false)}>
                <Ionicons name="close" size={24} color={"#FFFFFF"} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {SORT_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.sortOption,
                    sortBy === option.value && styles.sortOptionActive,
                  ]}
                  onPress={() => {
                    setSortBy(option.value);
                    setShowSortModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.sortOptionText,
                      sortBy === option.value && styles.sortOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {sortBy === option.value && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={"#D4AF37"}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Filters Sheet */}
      <FiltersSheet visible={showFilters} onClose={() => setShowFilters(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1F2937",
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    height: 48,
    marginBottom: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    marginHorizontal: theme.spacing.sm,
    fontSize: theme.typography.fontSize.md,
    color: "#FFFFFF",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: "#000000",
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: "#D4AF37",
  },
  filterButtonText: {
    fontSize: theme.typography.fontSize.sm,
    color: "#D4AF37",
    fontWeight: theme.typography.fontWeight.medium,
  },
  controlsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  viewToggle: {
    flexDirection: "row",
    backgroundColor: "#1F2937",
    borderRadius: theme.borderRadius.sm,
    padding: 2,
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  toggleButtonActive: {
    backgroundColor: "#D4AF37",
  },
  toggleText: {
    fontSize: theme.typography.fontSize.sm,
    color: "#FFFFFF",
    fontWeight: theme.typography.fontWeight.medium,
  },
  toggleTextActive: {
    color: "#000000",
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    backgroundColor: "#1F2937",
    borderRadius: theme.borderRadius.sm,
  },
  sortText: {
    fontSize: theme.typography.fontSize.sm,
    color: "#FFFFFF",
  },
  resultsCount: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  resultsText: {
    fontSize: theme.typography.fontSize.sm,
    color: "#4B5563",
  },
  listContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  listItemContainer: {
    marginVertical: theme.spacing.sm,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  marker: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 2,
  },
  markerAvailable: {
    backgroundColor: "#D4AF37",
    borderColor: "#D4AF37",
  },
  markerFull: {
    backgroundColor: "#374151",
    borderColor: "#374151",
  },
  markerText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    color: "#000000",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#1F2937",
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    maxHeight: "50%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
  },
  modalTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: "#FFFFFF",
  },
  sortOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
  },
  sortOptionActive: {
    backgroundColor: "#000000",
  },
  sortOptionText: {
    fontSize: theme.typography.fontSize.md,
    color: "#FFFFFF",
  },
  sortOptionTextActive: {
    color: "#D4AF37",
    fontWeight: theme.typography.fontWeight.medium,
  },
});