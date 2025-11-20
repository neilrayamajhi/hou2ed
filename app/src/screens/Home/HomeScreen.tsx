import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  FlatList,
  Animated,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { MapView, Marker, PROVIDER_GOOGLE } from "../../components/MapView";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { theme } from "../../theme";
import ListingCard from "../../components/ListingCard";
import FiltersSheet from "../Search/FiltersSheet";
import { useFilterStore } from "../../state/useFilterStore";
import { useLocation } from "../../hooks/useLocation";
import { filterMarketplaceListingsByQuick } from "../../data/mockListings";
import { fetchRealShelters } from "../../services/shelterService";
import type { ShelterWebsiteUrls } from "../../services/shelterWebsiteMapping";
import {
  getMarketplaceListings,
  type MarketplaceListing,
} from "../../services/marketplace.service";
import { usePerformance } from "../../utils/perf";
import type { RootStackNavigationProp } from "../../navigation/types";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

const MAP_DARK_STYLE = [
  {
    elementType: "geometry",
    stylers: [{ color: "#1a1a1a" }],
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#8a8a8a" }],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#1a1a1a" }],
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

// Memoized marker component defined OUTSIDE HomeScreen to prevent recreation
const MarkerComponent = React.memo(
  ({
    listing,
    index,
    isActive,
    onPress,
  }: {
    listing: MarketplaceListing;
    index: number;
    isActive: boolean;
    onPress: (index: number) => void;
  }) => {
    // Memoize the style array to prevent new references on every render
    const markerStyle = React.useMemo(
      () => [
        styles.mapMarker,
        listing.availability === "available"
          ? styles.markerAvailable
          : styles.markerFull,
        isActive && styles.markerActive,
      ],
      [listing.availability, isActive],
    );

    return (
      <Marker
        key={listing.id}
        coordinate={listing.coordinates}
        onPress={() => onPress(index)}
      >
        <View style={markerStyle}>
          {/* Price */}
          <Text style={styles.markerText}>
            {listing.price.isFree ? "FREE" : `$${listing.price.min}`}
          </Text>
          {/* Distance - only show if available */}
          {listing.distance !== undefined && (
            <View style={styles.markerDistanceRow}>
              <Ionicons name="navigate" size={10} color="#000000" />
              <Text style={styles.markerDistanceText}>
                {listing.distance.toFixed(1)} mi
              </Text>
            </View>
          )}
        </View>
      </Marker>
    );
  },
  (prev, next) =>
    prev.listing.id === next.listing.id &&
    prev.isActive === next.isActive &&
    prev.listing.price.isFree === next.listing.price.isFree &&
    prev.listing.price.min === next.listing.price.min &&
    prev.listing.availability === next.listing.availability &&
    prev.listing.distance === next.listing.distance &&
    prev.listing.coordinates.latitude === next.listing.coordinates.latitude &&
    prev.listing.coordinates.longitude === next.listing.coordinates.longitude,
);

MarkerComponent.displayName = "MarkerComponent";

/**
 * Helper function to open a website with fallback URLs
 * Tries primary URL first, then fallbacks in order
 */
async function openWebsiteWithFallback(
  urls: ShelterWebsiteUrls | null | undefined,
): Promise<void> {
  if (!urls) {
    console.log("No website URLs available");
    return;
  }

  const allUrls = [urls.primary, ...urls.fallbacks].filter(Boolean);

  for (const url of allUrls) {
    try {
      // Ensure URL has proper protocol
      let finalUrl = url.trim();
      if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
        finalUrl = "https://" + finalUrl;
      }

      console.log(`🌐 Attempting to open: ${finalUrl}`);

      // Try to open the URL directly without canOpenURL (unreliable on Android 11+)
      await Linking.openURL(finalUrl);
      console.log(`✅ Successfully opened: ${finalUrl}`);
      return; // Success - stop trying
    } catch (error) {
      console.warn(`❌ Failed to open ${url}, trying fallback...`, error);
      continue; // Try next URL
    }
  }

  // All URLs failed
  Alert.alert(
    "Unable to Open Website",
    "Please check your internet connection or try again later.",
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const mapRef = useRef<React.ElementRef<typeof MapView>>(null);
  const listRef = useRef<FlatList>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Get safe area insets for proper spacing on all iPhone models
  const insets = useSafeAreaInsets();

  // Get user location
  const { location, loading: locationLoading, refreshLocation } = useLocation();

  // Store state - Use individual selectors to prevent unnecessary re-renders
  const quickFilters = useFilterStore((state) => state.quickFilters);
  const toggleQuickFilter = useFilterStore((state) => state.toggleQuickFilter);
  const searchQuery = useFilterStore((state) => state.searchQuery);
  const setSearchQuery = useFilterStore((state) => state.setSearchQuery);

  // Local state
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null); // null = no marker tapped yet
  const [showFilters, setShowFilters] = useState(false);
  const [showListView, setShowListView] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [isRealData, setIsRealData] = useState(false);
  const [dataSource, setDataSource] = useState("Mock Data");
  // Initialize with Los Angeles (consistent with app defaults), will update to user location when available
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: 34.0522, // Los Angeles default
    longitude: -118.2437, // Los Angeles default
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [searchText, setSearchText] = useState("");

  // Performance tracking
  const listingLoadPerf = usePerformance("listingLoad");

  // Load real listings from database or fall back to mock data
  useEffect(() => {
    let isCancelled = false;

    async function loadListings() {
      // Don't load listings if location is still loading
      // This prevents the initial load with null location that causes 0.5 mile default
      if (locationLoading) {
        console.log("⏳ Waiting for location before loading listings...");
        return;
      }

      setLoadingData(true);
      listingLoadPerf.start();
      try {
        console.log("📍 Loading listings with location:", location);

        // Fetch Hou2ed partner listings from Supabase database
        const dbListings = await getMarketplaceListings(
          location?.latitude,
          location?.longitude,
          50, // 50 mile radius
        );

        // Check if component was unmounted or effect was re-run
        if (isCancelled) {
          console.log("⚠️ Listings fetch cancelled (component unmounted)");
          return;
        }

        // Fetch external listings from OpenStreetMap (free, no API key needed)
        let osmListings: MarketplaceListing[] = [];
        try {
          const userLat = location?.latitude || 34.0522; // LA default
          const userLng = location?.longitude || -118.2437; // LA default

          console.log(
            `🔍 Fetching OSM listings with user location:`,
            `\n   latitude: ${location?.latitude} (using: ${userLat})`,
            `\n   longitude: ${location?.longitude} (using: ${userLng})`,
            `\n   Location available: ${!!location?.latitude && !!location?.longitude}`,
          );

          osmListings = await fetchRealShelters(userLat, userLng, 16);
          console.log(`✅ Found ${osmListings.length} OSM external listings`);

          // Debug: Check distances in returned listings
          console.log(`\n📍 DISTANCE CHECK - First 3 OSM listings:`);
          osmListings.slice(0, 3).forEach((listing, i) => {
            console.log(
              `   ${i + 1}. ${listing.name}`,
              `\n      distance: ${listing.distance !== undefined ? listing.distance.toFixed(2) + " miles" : "UNDEFINED"}`,
              `\n      coords: (${listing.coordinates.latitude}, ${listing.coordinates.longitude})`,
            );
          });

          // Also calculate distance manually for first listing to verify
          if (osmListings.length > 0) {
            const first = osmListings[0];
            console.log(
              `\n🧪 MANUAL VERIFICATION for "${first.name}":`,
              `\n   User: (${userLat}, ${userLng})`,
              `\n   Shelter: (${first.coordinates.latitude}, ${first.coordinates.longitude})`,
            );
          }

          // Debug: Check if all listings have unique websites
          const websites = osmListings
            .map((l) => l.contact?.website)
            .filter(Boolean);
          const uniqueWebsites = new Set(websites);
          console.log(
            `   Unique websites: ${uniqueWebsites.size} out of ${websites.length}`,
          );
          if (uniqueWebsites.size < websites.length) {
            console.warn(`⚠️ WARNING: Duplicate websites detected!`);
            websites.forEach((w, i) => {
              console.log(`   ${i + 1}. ${osmListings[i].name}: ${w}`);
            });
          }
        } catch (osmError) {
          console.warn("⚠️ Failed to fetch OSM listings:", osmError);
          // Continue without OSM listings if they fail
        }

        // Combine Hou2ed partners + OSM external listings
        const allListings: MarketplaceListing[] = [
          ...(dbListings || []),
          ...osmListings,
        ];

        // Sort: Partners first, then by distance
        allListings.sort((a, b) => {
          // Hou2ed partners come first
          if (a.source === "hou2ed" && b.source !== "hou2ed") return -1;
          if (a.source !== "hou2ed" && b.source === "hou2ed") return 1;
          // Then sort by distance
          return (a.distance || 999) - (b.distance || 999);
        });

        console.log(
          `✅ Total listings: ${allListings.length} (${dbListings?.length || 0} partners + ${osmListings.length} external)`,
        );

        setIsRealData(true);
        setDataSource(
          `${dbListings?.length || 0} Partners + ${osmListings.length} Community`,
        );

        // Set combined listings - filtering will be done via useMemo
        setListings(allListings);
      } catch (error) {
        if (!isCancelled) {
          console.error("Error loading listings:", error);
          // On error, show empty list (no mock)
          setListings([]);
        }
      } finally {
        if (!isCancelled) {
          listingLoadPerf.end();
          setLoadingData(false);
        }
      }
    }

    loadListings();

    // Cleanup function: cancel the fetch if component unmounts
    return () => {
      isCancelled = true;
    };
  }, [location?.latitude, location?.longitude, locationLoading]);

  // Memoize filtered listings to prevent unnecessary re-renders
  const filteredListings = useMemo(() => {
    return filterMarketplaceListingsByQuick(listings, quickFilters);
  }, [listings, quickFilters]);

  // Validate and reset activeIndex when filtered listings change
  useEffect(() => {
    // Only reset if activeIndex is out of bounds (don't auto-select on load)
    if (
      activeIndex !== null &&
      activeIndex >= filteredListings.length &&
      filteredListings.length > 0
    ) {
      console.log("⚠️ activeIndex out of bounds, resetting to null");
      setActiveIndex(null);
    } else if (filteredListings.length === 0 && activeIndex !== null) {
      setActiveIndex(null);
    }
  }, [filteredListings.length, activeIndex]);

  // Update map region when user location is loaded
  useEffect(() => {
    if (location && !locationLoading) {
      const newRegion = {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };

      // ALWAYS update the state so it persists when toggling views
      setMapRegion(newRegion);

      // Also animate if map is currently mounted
      if (mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 1000);
      }
    }
  }, [location, locationLoading]);

  // Animate list view toggle
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: showListView ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [showListView]);

  // Handle search submit
  const handleSearch = useCallback(() => {
    setSearchQuery(searchText);
    // In real app, this would trigger a new search
  }, [searchText, setSearchQuery]);

  // Handle marker press
  const handleMarkerPress = useCallback(
    (index: number) => {
      setActiveIndex(index);
      if (showListView && listRef.current) {
        listRef.current.scrollToIndex({ index, animated: true });
      }
    },
    [showListView],
  );

  // Navigate to listing details
  const openDetails = useCallback(
    (listing: MarketplaceListing) => {
      console.log("Opening details for:", listing.name);
      // @ts-ignore - Navigation types will be updated
      navigation.navigate("ListingDetails", { listingId: listing.id, listing });
    },
    [navigation],
  );

  // Toggle between map and list view
  const toggleView = () => {
    setShowListView(!showListView);
  };

  // Center map on user location
  const centerOnUserLocation = useCallback(async () => {
    if (location) {
      const userRegion = {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };

      // Update state so it persists when toggling views
      setMapRegion(userRegion);

      // Also animate if map is mounted
      if (mapRef.current) {
        mapRef.current.animateToRegion(userRegion, 500);
      }
    } else {
      // Try to get location again if not available
      await refreshLocation();
    }
  }, [location, refreshLocation]);

  // Render listing item for list view
  const renderListItem = ({
    item,
    index,
  }: {
    item: MarketplaceListing;
    index: number;
  }) => {
    // Check if this is an OSM listing (minimal display)
    // OSM listings always show minimal display since they lack full details
    // Note: All OSM listings are guaranteed to have a website (filtered at API level)
    const isOsmListing = item.source === "osm";

    // Unified listing display for both OSM and HOU2ED partner listings
    return (
      <TouchableOpacity
        style={styles.listItem}
        onPress={() => openDetails(item)}
        activeOpacity={0.7}
      >
        <View style={styles.listItemContent}>
          <View style={styles.listItemHeader}>
            <View style={styles.listItemTitleRow}>
              <Text style={styles.listItemTitle}>{item.name}</Text>
              {/* Badge based on source */}
              {isOsmListing ? (
                <View style={styles.communityBadge}>
                  <Ionicons name="people-outline" size={12} color="#8a8a8a" />
                  <Text style={styles.communityBadgeText}>Community</Text>
                </View>
              ) : (
                <View style={styles.partnerBadge}>
                  <Ionicons name="shield-checkmark" size={12} color="#D4AF37" />
                  <Text style={styles.partnerBadgeText}>Partner</Text>
                </View>
              )}
            </View>
            <View
              style={[
                styles.availabilityBadge,
                item.availability === "available"
                  ? styles.availableBadge
                  : styles.fullBadge,
              ]}
            >
              <Text style={styles.badgeText}>
                {item.availability === "available"
                  ? `${item.bedsAvailable} beds`
                  : item.availability === "unknown"
                    ? "Call"
                    : "Full"}
              </Text>
            </View>
          </View>

          <Text style={styles.listItemAddress}>
            <Ionicons name="location" size={14} color="#8a8a8a" />{" "}
            {item.address.street}, {item.address.city}
          </Text>

          <View style={styles.listItemFooter}>
            <Text style={styles.listItemPrice}>
              {item.price.isFree ? "FREE" : `$${item.price.min}/mo`}
            </Text>
            <View style={styles.listItemDistance}>
              <Ionicons name="navigate" size={14} color="#D4AF37" />
              <Text style={styles.distanceText}>
                {item.distance !== undefined
                  ? `${item.distance.toFixed(1)} mi`
                  : "N/A"}
              </Text>
            </View>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#8a8a8a" />
      </TouchableOpacity>
    );
  };

  const renderQuickFilter = (
    key: keyof typeof quickFilters,
    label: string,
    icon: string,
  ) => (
    <TouchableOpacity
      key={key}
      style={[
        styles.quickFilter,
        quickFilters[key] && styles.quickFilterActive,
      ]}
      onPress={() => toggleQuickFilter(key)}
      activeOpacity={0.7}
    >
      <Ionicons
        name={icon as any}
        size={18}
        color={quickFilters[key] ? "#000000" : "#D4AF37"}
      />
      <Text
        style={[
          styles.quickFilterText,
          quickFilters[key] && styles.quickFilterTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Real Data Indicator */}
      {isRealData && (
        <View style={[styles.realDataBanner, { top: insets.top + 10 }]}>
          <Ionicons name="checkmark-circle" size={16} color="#21C55D" />
          <Text style={styles.realDataText}>{dataSource}</Text>
          <Text style={styles.realDataSubtext}>Live Updates</Text>
        </View>
      )}

      {/* Map View */}
      {!showListView && (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            customMapStyle={MAP_DARK_STYLE}
            initialRegion={mapRegion}
            showsUserLocation
            showsMyLocationButton={false}
          >
            {filteredListings.map((listing, index) => (
              <MarkerComponent
                key={listing.id}
                listing={listing}
                index={index}
                isActive={activeIndex === index}
                onPress={handleMarkerPress}
              />
            ))}
          </MapView>

          {/* Floating Map Controls */}
          <TouchableOpacity
            style={styles.myLocationButton}
            activeOpacity={0.8}
            onPress={centerOnUserLocation}
          >
            {locationLoading ? (
              <ActivityIndicator size="small" color="#D4AF37" />
            ) : (
              <Ionicons name="navigate" size={24} color="#D4AF37" />
            )}
          </TouchableOpacity>

          {/* Floating Listing Card */}
          {activeIndex !== null && filteredListings[activeIndex] && (
            <View style={styles.floatingCard}>
              <TouchableOpacity
                style={styles.floatingCardContent}
                onPress={() => openDetails(filteredListings[activeIndex])}
                activeOpacity={0.9}
              >
                <View style={styles.floatingCardHeader}>
                  <View style={styles.floatingCardTitleRow}>
                    <Text style={styles.floatingCardTitle} numberOfLines={1}>
                      {filteredListings[activeIndex].name}
                    </Text>
                    {filteredListings[activeIndex].source === "osm" ? (
                      <View style={styles.floatingCardBadge}>
                        <Ionicons
                          name="people-outline"
                          size={10}
                          color="#8a8a8a"
                        />
                        <Text style={styles.floatingCardBadgeText}>
                          Community
                        </Text>
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.floatingCardBadge,
                          styles.floatingCardPartnerBadge,
                        ]}
                      >
                        <Ionicons
                          name="shield-checkmark"
                          size={10}
                          color="#D4AF37"
                        />
                        <Text style={styles.floatingCardPartnerBadgeText}>
                          Partner
                        </Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.floatingCardClose}
                    onPress={() => setActiveIndex(null)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close" size={20} color="#8a8a8a" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.floatingCardAddress} numberOfLines={1}>
                  <Ionicons name="location" size={12} color="#8a8a8a" />{" "}
                  {filteredListings[activeIndex].address.street},{" "}
                  {filteredListings[activeIndex].address.city}
                </Text>

                <View style={styles.floatingCardFooter}>
                  <Text style={styles.floatingCardPrice}>
                    {filteredListings[activeIndex].price.isFree
                      ? "FREE"
                      : `$${filteredListings[activeIndex].price.min}/mo`}
                  </Text>
                  <View style={styles.floatingCardDistance}>
                    <Ionicons name="navigate" size={12} color="#D4AF37" />
                    <Text style={styles.floatingCardDistanceText}>
                      {filteredListings[activeIndex].distance !== undefined
                        ? `${filteredListings[activeIndex].distance.toFixed(1)} mi`
                        : "N/A"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#D4AF37" />
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* List View */}
      {showListView && (
        <Animated.View
          style={[
            styles.listViewContainer,
            {
              opacity: slideAnim,
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <FlatList
            ref={listRef}
            data={filteredListings}
            renderItem={renderListItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              { paddingTop: insets.top + 100 },
            ]}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
          />
        </Animated.View>
      )}

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomBarContent}>
          <View style={styles.resultsInfo}>
            {loadingData ? (
              <ActivityIndicator size="small" color="#D4AF37" />
            ) : (
              <>
                <Text style={styles.resultsCount}>
                  {filteredListings.length} places
                </Text>
                <Text style={styles.resultsSubtext}>in this area</Text>
              </>
            )}
          </View>

          <TouchableOpacity
            style={styles.viewToggleButton}
            onPress={toggleView}
            activeOpacity={0.8}
          >
            <Ionicons
              name={showListView ? "map" : "list"}
              size={20}
              color="#000"
            />
            <Text style={styles.viewToggleText}>
              {showListView ? "Map" : "List"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Mini Card Preview (Map View Only) - Only show after user taps a marker */}
        {!showListView &&
          activeIndex !== null &&
          filteredListings[activeIndex] && (
            <TouchableOpacity
              style={styles.miniCard}
              onPress={() => openDetails(filteredListings[activeIndex])}
              activeOpacity={0.9}
            >
              <View style={styles.miniCardContent}>
                <View style={styles.miniCardHeader}>
                  <Text style={styles.miniCardTitle} numberOfLines={1}>
                    {filteredListings[activeIndex].name}
                  </Text>
                  {filteredListings[activeIndex].source === "hou2ed" ? (
                    <View style={styles.partnerBadge}>
                      <Ionicons
                        name="shield-checkmark"
                        size={12}
                        color="#10B981"
                      />
                      <Text style={styles.partnerBadgeText}>Partner</Text>
                    </View>
                  ) : (
                    <View style={styles.externalBadge}>
                      <Ionicons
                        name="globe-outline"
                        size={12}
                        color="#6B7280"
                      />
                      <Text style={styles.externalBadgeText}>Community</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.miniCardAddress} numberOfLines={1}>
                  {filteredListings[activeIndex].address.street},{" "}
                  {filteredListings[activeIndex].address.city}
                </Text>
                <View style={styles.miniCardFooter}>
                  <Text style={styles.miniCardPrice}>
                    {filteredListings[activeIndex].price.isFree
                      ? "FREE"
                      : `$${filteredListings[activeIndex].price.min}/mo`}
                  </Text>
                  <View
                    style={[
                      styles.miniCardBadge,
                      filteredListings[activeIndex].availability === "available"
                        ? styles.miniCardBadgeAvailable
                        : filteredListings[activeIndex].availability ===
                            "unknown"
                          ? styles.miniCardBadgeUnknown
                          : styles.miniCardBadgeFull,
                    ]}
                  >
                    <Text style={styles.miniCardBadgeText}>
                      {filteredListings[activeIndex].availability ===
                      "available"
                        ? `${filteredListings[activeIndex].bedsAvailable} beds`
                        : filteredListings[activeIndex].availability ===
                            "unknown"
                          ? "Call for info"
                          : "Full"}
                    </Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#D4AF37" />
            </TouchableOpacity>
          )}
      </View>

      {/* Filters Sheet */}
      <FiltersSheet
        visible={showFilters}
        onClose={() => setShowFilters(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  realDataBanner: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(33, 197, 93, 0.15)",
    borderColor: "#21C55D",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    zIndex: 11,
    gap: 6,
  },
  realDataText: {
    color: "#21C55D",
    fontSize: 12,
    fontWeight: "600",
  },
  realDataSubtext: {
    color: "#21C55D",
    fontSize: 11,
    opacity: 0.8,
  },
  searchWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#FFFFFF",
  },
  filterIcon: {
    marginLeft: 12,
  },
  filterIconBadge: {
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    padding: 8,
  },
  quickFiltersScroll: {
    marginTop: 12,
    maxHeight: 40,
  },
  quickFiltersContent: {
    gap: 8,
    paddingRight: 16,
  },
  quickFilter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  quickFilterActive: {
    backgroundColor: "#D4AF37",
    borderColor: "#D4AF37",
  },
  quickFilterText: {
    fontSize: 14,
    color: "#D4AF37",
    fontWeight: "500",
  },
  quickFilterTextActive: {
    color: "#000000",
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapMarker: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  markerAvailable: {
    backgroundColor: "#D4AF37",
  },
  markerFull: {
    backgroundColor: "#6a6a6a",
  },
  markerActive: {
    transform: [{ scale: 1.1 }],
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 5,
  },
  markerText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#000000",
  },
  markerDistanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 2,
  },
  markerDistanceText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#000000",
  },
  myLocationButton: {
    position: "absolute",
    right: 16,
    bottom: 180,
    backgroundColor: "#1a1a1a",
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  floatingCard: {
    position: "absolute",
    bottom: 200,
    left: 16,
    right: 16,
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingCardContent: {
    padding: 16,
  },
  floatingCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  floatingCardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
    marginRight: 8,
  },
  floatingCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
    flex: 1,
  },
  floatingCardBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#2a2a2a",
    borderRadius: 12,
  },
  floatingCardPartnerBadge: {
    backgroundColor: "rgba(212, 175, 55, 0.1)",
  },
  floatingCardBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#8a8a8a",
  },
  floatingCardPartnerBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#D4AF37",
  },
  floatingCardClose: {
    padding: 4,
  },
  floatingCardAddress: {
    fontSize: 13,
    color: "#8a8a8a",
    marginBottom: 12,
  },
  floatingCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  floatingCardPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#D4AF37",
  },
  floatingCardDistance: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
    marginLeft: 12,
  },
  floatingCardDistanceText: {
    fontSize: 13,
    color: "#8a8a8a",
  },
  listViewContainer: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  listContent: {
    paddingBottom: 150,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 12,
  },
  listItemContent: {
    flex: 1,
  },
  listItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  listItemTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginRight: 8,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    flexShrink: 1,
  },
  partnerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "rgba(212, 175, 55, 0.15)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D4AF37",
  },
  partnerBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#D4AF37",
  },
  communityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "rgba(138, 138, 138, 0.15)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#8a8a8a",
  },
  communityBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#8a8a8a",
  },
  availabilityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  availableBadge: {
    backgroundColor: "#21C55D",
  },
  fullBadge: {
    backgroundColor: "#6a6a6a",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  listItemAddress: {
    fontSize: 14,
    color: "#8a8a8a",
    marginBottom: 12,
  },
  listItemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listItemPrice: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#D4AF37",
  },
  listItemDistance: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  distanceText: {
    fontSize: 14,
    color: "#8a8a8a",
  },
  listSeparator: {
    height: 12,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#1a1a1a",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 10,
  },
  bottomBarContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  resultsInfo: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  resultsCount: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  resultsSubtext: {
    fontSize: 14,
    color: "#8a8a8a",
  },
  viewToggleButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#D4AF37",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  viewToggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
  },
  miniCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2a2a2a",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  miniCardContent: {
    flex: 1,
  },
  miniCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  miniCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    flex: 1,
  },
  partnerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#10B981",
  },
  partnerBadgeText: {
    fontSize: 10,
    color: "#10B981",
    fontWeight: "600",
  },
  externalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "#374151",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#4B5563",
  },
  externalBadgeText: {
    fontSize: 10,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  miniCardAddress: {
    fontSize: 13,
    color: "#8a8a8a",
    marginBottom: 8,
  },
  miniCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  miniCardPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#D4AF37",
  },
  miniCardBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  miniCardBadgeAvailable: {
    backgroundColor: "#21C55D", // Green for available
  },
  miniCardBadgeUnknown: {
    backgroundColor: "#6B7280", // Gray for unknown (external listings)
  },
  miniCardBadgeFull: {
    backgroundColor: "#EF4444", // Red for full
  },
  miniCardBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
