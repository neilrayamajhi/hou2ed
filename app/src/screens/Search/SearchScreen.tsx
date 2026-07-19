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
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MapView, Marker } from "../../components/MapView";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { theme } from "../../theme";
import ListingCard from "../../components/ListingCard";
import ListingCardSkeleton from "../../components/ListingCardSkeleton";
import EmptyState from "../../components/EmptyState";
import OfflineBanner from "../../components/OfflineBanner";
import FiltersSheet from "./FiltersSheet";
import { useFilterStore } from "../../state/useFilterStore";
import { supabase } from "../../lib/supabase";
import { saveSearch } from "../../services/saved.service";
import { sortListings, SORT_OPTIONS } from "../../utils/sortListings";
import { filterListingsByQuick } from "../../data/mockListings";
import { usePerformance } from "../../utils/perf";
import type {
  Listing,
  Cost,
  Availability,
  HousingType,
} from "../../types/listing";
import type { SortOption, HousingTypeFilter } from "../../types/filters";

const HOUSING_TYPE_TO_LISTING_TYPE: Record<keyof HousingTypeFilter, string> = {
  emergencyShelter:        "emergency_shelter",
  transitionalHousing:     "transitional_housing",
  rapidRehousing:          "rapid_rehousing",
  permanentSupportive:     "permanent_supportive",
  soberLiving:             "sober_living",
  halfwayHouse:            "halfway_house",
  groupHome:               "group_home",
  independentLiving:       "independent_living",
  assistedLiving:          "assisted_living",
  nursingHome:             "nursing_home",
  veteransHousing:         "veterans_housing",
  youthHousing:            "youth_housing",
  domesticViolenceShelter: "domestic_violence_shelter",
};

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
  const route = useRoute<any>();

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
    loadSnapshot,
    snapshot,
  } = useFilterStore();
  const housingType = useFilterStore((state) => state.housingType as HousingTypeFilter);

  // Apply filters from a saved search, if we were navigated here with one
  useEffect(() => {
    const savedFilters = route.params?.savedFilters;
    if (savedFilters) {
      loadSnapshot(savedFilters);
    }
    // Only ever apply the filters this screen was opened with, once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Local state
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchText, setSearchText] = useState(searchQuery);
  const [showSortModal, setShowSortModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSaveSearchModal, setShowSaveSearchModal] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState("");
  const [isSavingSearch, setIsSavingSearch] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [listings, setListings] = useState<Listing[]>([]);

  // Performance tracking
  const searchPerf = usePerformance("search");
  const mapPerf = usePerformance("mapUpdate");

  // Monitor network connectivity (disabled for web)
  useEffect(() => {
    // NetInfo not available on web, default to online
    setIsOffline(false);
  }, []);

  // Load listings from Supabase and map to card model
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    (async () => {
      try {
        searchPerf.start();
        // Query the DV-safety view, not the raw table: it obfuscates
        // address/lat/lng to city-level precision for anyone who isn't the
        // listing's own provider or an admin, for any listing flagged
        // dv_sensitive. The raw `listings` table intentionally denies
        // direct access to those rows for everyone else.
        const { data, error } = await supabase
          .from("public_listings")
          .select(
            "id,provider_id,title,description,address,city,state,zip_code,lat,lng,housing_type,unit_beds,ada_beds,gender_rooming,amenities,accessibility,eligibility,services,rules,cost,intake,availability,verified,certifications,images,responsiveness,dv_sensitive,is_active,created_at,updated_at",
          )
          .eq("is_active", true)
          .limit(100);
        if (error) {
          console.error("Fetch listings error:", error);
          return;
        }
        // Normalize images to public https URLs
        const toArray = (v: any) => (Array.isArray(v) ? v : v ? [v] : []);
        const toStringVal = (v: any) => {
          if (v == null) return null;
          if (typeof v === "string") return v.trim();
          if (typeof v === "object" && (v as any).url)
            return String((v as any).url).trim();
          try {
            return String(v).trim();
          } catch {
            return null;
          }
        };
        const toPublicUrl = (p: string | null) => {
          if (!p) return null;
          if (/^https?:\/\//i.test(p)) return p;
          const { data: pub } = supabase.storage
            .from("listing-images")
            .getPublicUrl(p);
          return pub?.publicUrl || null;
        };

        const mapped: Listing[] = (data || []).map((row: any) => {
          const normalizedImages: string[] = toArray(row.images)
            .map(toStringVal)
            .filter(Boolean)
            .map((s) => toPublicUrl(s as string))
            .filter((u): u is string => !!u && /^https?:\/\//i.test(u));
          const coverImage = normalizedImages[0] || undefined;
          try {
            console.log(
              "[Search] listing",
              row.id,
              "images:",
              normalizedImages,
            );
          } catch {}
          // Use correct Listing type structure - cost instead of price
          const cost: Cost = {
            monthly: row?.cost?.monthly || undefined,
            deposit: row?.cost?.deposit || undefined,
            program_fee: row?.cost?.program_fee || undefined,
            accepts: row?.cost?.accepts || [],
            sliding_scale: row?.cost?.sliding_scale || false,
            free: row?.cost?.free === true || !row?.cost?.monthly,
          };
          const avail = row?.availability || {};
          const bedsToday = Number(avail?.beds_today || 0);
          const availability: Availability = {
            beds_today: bedsToday,
            beds_week: Number(avail?.beds_week || 0),
            waitlist: Number(avail?.waitlist || 0),
            last_updated_at: avail?.last_updated_at || null,
          };

          // Map to full Listing type
          return {
            id: row.id,
            provider_id: row.provider_id || "",
            title: row.title,
            description: row.description || "",
            address: row.address || "",
            city: row.city || "",
            state: row.state || "",
            zip_code: row.zip_code || "",
            lat: row.lat || 0,
            lng: row.lng || 0,
            housing_type: row.housing_type || ("shelter" as HousingType),
            unit_beds: row.unit_beds || {},
            ada_beds: row.ada_beds || 0,
            gender_rooming: row.gender_rooming,
            amenities: row.amenities,
            accessibility: row.accessibility,
            eligibility: row.eligibility,
            services: row.services,
            rules: row.rules,
            cost,
            intake: row.intake,
            availability,
            verified: !!row.verified,
            certifications: row.certifications,
            images: normalizedImages,
            responsiveness: row.responsiveness,
            dv_sensitive: row.dv_sensitive || false,
            is_active: row.is_active !== false,
            created_at: row.created_at || new Date().toISOString(),
            updated_at: row.updated_at || new Date().toISOString(),
            distance: undefined,
          };
        });

        // Text filter
        const query = (searchQuery || "").toLowerCase();
        let filtered = !query
          ? mapped
          : mapped.filter(
              (l: Listing) =>
                (l.title || "").toLowerCase().includes(query) ||
                (l.city || "").toLowerCase().includes(query) ||
                (l.address || "").toLowerCase().includes(query),
            );

        const housingTypeSnakeCase: Record<string, boolean> = {};
        (Object.keys(HOUSING_TYPE_TO_LISTING_TYPE) as Array<keyof HousingTypeFilter>).forEach(
          (key) => {
            housingTypeSnakeCase[HOUSING_TYPE_TO_LISTING_TYPE[key]] = housingType[key] ?? false;
          },
        );
        filtered = filterListingsByQuick(filtered, quickFilters, housingTypeSnakeCase);

        const sorted = sortListings(filtered, sortBy);
        if (!cancelled) {
          setListings(sorted);
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) setIsLoading(false);
      } finally {
        searchPerf.end();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [quickFilters, housingType, searchQuery, sortBy]);

  // Handle search
  const handleSearch = useCallback(() => {
    setSearchQuery(searchText);
    console.log("Searching for:", searchText);
    // TODO: Add geocoding to center map on searched location
    // For now, just filter the listings by text
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

  // Save the current search + filters for later
  const handleSaveSearch = useCallback(async () => {
    const name = saveSearchName.trim();
    if (!name) return;

    setIsSavingSearch(true);
    const result = await saveSearch({
      name,
      filters: snapshot() as any,
    });
    setIsSavingSearch(false);

    if (result.success) {
      setShowSaveSearchModal(false);
      setSaveSearchName("");
      Alert.alert("Search Saved", `"${name}" has been saved.`);
    } else {
      Alert.alert("Error", result.error || "Failed to save search");
    }
  }, [saveSearchName, snapshot]);

  // Open details
  const openDetails = useCallback(
    (listing: Listing) => {
      console.log("Open details:", listing.id);
      // @ts-ignore - Navigation types will be updated
      navigation.navigate("ListingDetails", { listingId: listing.id, listing });
    },
    [navigation],
  );

  // Render listing item
  const renderListingItem = useCallback(
    ({ item }: { item: Listing }) => (
      <View style={styles.listItemContainer}>
        <ListingCard listing={item} onPress={() => openDetails(item)} />
      </View>
    ),
    [openDetails],
  );

  // List key extractor
  const keyExtractor = useCallback((item: Listing) => item.id, []);

  // Memoized map markers — only recalculated when the listings array changes,
  // not on every unrelated state update (e.g. text input, sort modal toggle).
  const mapMarkers = useMemo(
    () =>
      listings.map((listing) => (
        <Marker
          key={listing.id}
          coordinate={{ latitude: listing.lat, longitude: listing.lng }}
          onPress={() => openDetails(listing)}
        >
          <View
            style={[
              styles.marker,
              listing.availability.beds_today > 0
                ? styles.markerAvailable
                : styles.markerFull,
            ]}
          >
            <Text style={styles.markerText}>
              {listing.cost?.free
                ? "FREE"
                : listing.cost?.monthly
                  ? `$${listing.cost.monthly}`
                  : "Contact"}
            </Text>
          </View>
        </Marker>
      )),
    [listings, openDetails],
  );

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
          <Ionicons name="search-outline" size={20} color={"#4B5563"} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search location or shelter..."
            placeholderTextColor={"#4B5563"}
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openFilters} style={styles.filterButton}>
            <Ionicons name="options-outline" size={20} color={"#D4AF37"} />
            <Text style={styles.filterButtonText}>
              Filters{filterCountText}
            </Text>
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
            <Ionicons name="chevron-down-outline" size={16} color={"#4B5563"} />
          </TouchableOpacity>

          {/* Save Search */}
          <TouchableOpacity
            style={styles.saveSearchButton}
            onPress={() => setShowSaveSearchModal(true)}
            accessibilityLabel="Save this search"
            accessibilityRole="button"
          >
            <Ionicons name="bookmark-outline" size={18} color={"#D4AF37"} />
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
      {isLoading ? (
        <View style={styles.listContent}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.listItemContainer}>
              <ListingCardSkeleton />
            </View>
          ))}
        </View>
      ) : listings.length === 0 ? (
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
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
        />
      ) : (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
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
            {mapMarkers}
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
                    <Ionicons name="checkmark" size={20} color={"#D4AF37"} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Filters Sheet */}
      <FiltersSheet
        visible={showFilters}
        onClose={() => setShowFilters(false)}
      />

      {/* Save Search Modal */}
      <Modal
        visible={showSaveSearchModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSaveSearchModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSaveSearchModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Save Search</Text>
              <TouchableOpacity onPress={() => setShowSaveSearchModal(false)}>
                <Ionicons name="close" size={24} color={"#FFFFFF"} />
              </TouchableOpacity>
            </View>
            <View style={styles.saveSearchBody}>
              <Text style={styles.saveSearchLabel}>
                Give this search a name so you can find it again later
                {filterCountText
                  ? ` (${getActiveFilterCount()} filters applied)`
                  : ""}
                .
              </Text>
              <TextInput
                style={styles.saveSearchInput}
                placeholder="e.g. Shelters near downtown"
                placeholderTextColor={"#4B5563"}
                value={saveSearchName}
                onChangeText={setSaveSearchName}
                autoFocus
                editable={!isSavingSearch}
              />
              <TouchableOpacity
                style={[
                  styles.saveSearchSubmit,
                  (!saveSearchName.trim() || isSavingSearch) &&
                    styles.saveSearchSubmitDisabled,
                ]}
                onPress={handleSaveSearch}
                disabled={!saveSearchName.trim() || isSavingSearch}
              >
                <Text style={styles.saveSearchSubmitText}>
                  {isSavingSearch ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  searchButton: {
    backgroundColor: "#D4AF37",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.xs,
  },
  searchButtonText: {
    fontSize: theme.typography.fontSize.sm,
    color: "#000000",
    fontWeight: theme.typography.fontWeight.semibold,
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
  saveSearchButton: {
    justifyContent: "center",
    alignItems: "center",
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: "#1F2937",
  },
  saveSearchBody: {
    padding: theme.spacing.lg,
  },
  saveSearchLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: "#9CA3AF",
    marginBottom: theme.spacing.md,
  },
  saveSearchInput: {
    backgroundColor: "#111827",
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.typography.fontSize.md,
    color: "#FFFFFF",
    marginBottom: theme.spacing.md,
  },
  saveSearchSubmit: {
    backgroundColor: "#D4AF37",
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    alignItems: "center",
  },
  saveSearchSubmitDisabled: {
    opacity: 0.5,
  },
  saveSearchSubmitText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: "#000000",
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
