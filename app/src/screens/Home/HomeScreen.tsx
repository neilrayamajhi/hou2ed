import React, { useState, useRef, useEffect, useCallback } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MapView, Marker, PROVIDER_GOOGLE } from "../../components/MapView";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { theme } from "../../theme";
import ListingCard from "../../components/ListingCard";
import FiltersSheet from "../Search/FiltersSheet";
import { useFilterStore } from "../../state/useFilterStore";
import { useLocation } from "../../hooks/useLocation";
import { filterListingsByQuick } from "../../data/mockListings";
import { fetchRealShelters } from "../../services/shelterService";
import { getMarketplaceListings, type MarketplaceListing } from "../../services/marketplace.service";
import { usePerformance } from "../../utils/perf";
import type { Listing } from "../../types/listing";
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

export default function HomeScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const mapRef = useRef<MapView>(null);
  const listRef = useRef<FlatList>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Get user location
  const { location, loading: locationLoading, refreshLocation } = useLocation();

  // Store state
  const { quickFilters, toggleQuickFilter, searchQuery, setSearchQuery } =
    useFilterStore();

  // Local state
  const [listings, setListings] = useState<Listing[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [showListView, setShowListView] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [isRealData, setIsRealData] = useState(false);
  const [dataSource, setDataSource] = useState('Mock Data');
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [searchText, setSearchText] = useState("");

  // Performance tracking
  const mapPerf = usePerformance("mapUpdate");
  const listingLoadPerf = usePerformance("listingLoad");

  // Load real listings from database or fall back to mock data
  useEffect(() => {
    async function loadListings() {
      // Don't load listings if location is still loading
      // This prevents the initial load with null location that causes 0.5 mile default
      if (locationLoading) {
        console.log('⏳ Waiting for location before loading listings...');
        return;
      }

      setLoadingData(true);
      listingLoadPerf.start();
      try {
        console.log('📍 Loading listings with location:', location);

        // Fetch real listings from Supabase database
        const dbListings = await getMarketplaceListings(
          location?.latitude,
          location?.longitude,
          50 // 50 mile radius
        );

        let allListings: Listing[];

        if (dbListings && dbListings.length > 0) {
          // Use database listings
          allListings = dbListings as any;
          console.log(`✅ Found ${dbListings.length} real listings from database with proper distances`);
          setIsRealData(true);
          setDataSource('Live Database');
        } else {
          // No database listings — show empty list (no mock)
          console.log('No database listings found');
          allListings = [] as any;
          setIsRealData(true);
          setDataSource('Live Database');
        }

        const filtered = filterListingsByQuick(allListings, quickFilters);
        setListings(filtered);
      } catch (error) {
        console.error('Error loading listings:', error);
        // On error, show empty list (no mock)
        setListings([]);
      } finally {
        listingLoadPerf.end();
        setLoadingData(false);
      }
    }

    loadListings();
  }, [quickFilters, location, locationLoading]);

  // Update map region when user location is loaded
  useEffect(() => {
    if (location && !locationLoading) {
      const newRegion = {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
      setMapRegion(newRegion);

      // Animate to the new region if map is ready
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
    (listing: Listing) => {
      console.log("Opening details for:", listing.title);
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

      if (mapRef.current) {
        mapRef.current.animateToRegion(userRegion, 500);
      }
      setMapRegion(userRegion);
    } else {
      // Try to get location again if not available
      await refreshLocation();
    }
  }, [location, refreshLocation]);

  // Render listing item for list view
  const renderListItem = ({ item, index }: { item: Listing; index: number }) => (
    <TouchableOpacity
      style={styles.listItem}
      onPress={() => openDetails(item)}
      activeOpacity={0.7}
    >
      <View style={styles.listItemContent}>
        <View style={styles.listItemHeader}>
          <Text style={styles.listItemTitle}>{item.name}</Text>
          <View style={[styles.availabilityBadge,
            item.availability === 'available' ? styles.availableBadge : styles.fullBadge
          ]}>
            <Text style={styles.badgeText}>
              {item.availability === 'available' ? `${item.bedsAvailable} beds` : 'Full'}
            </Text>
          </View>
        </View>

        <Text style={styles.listItemAddress}>
          <Ionicons name="location" size={14} color="#8a8a8a" />
          {' '}{item.address.street}, {item.address.city}
        </Text>

        <View style={styles.listItemFooter}>
          <Text style={styles.listItemPrice}>
            {item.price.isFree ? 'FREE' : `$${item.price.min}/mo`}
          </Text>
          <View style={styles.listItemDistance}>
            <Ionicons name="navigate" size={14} color="#D4AF37" />
            <Text style={styles.distanceText}>
              {item.distance !== undefined ? `${item.distance} mi` : 'Calculating...'}
            </Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#8a8a8a" />
    </TouchableOpacity>
  );

  const renderQuickFilter = (
    key: keyof typeof quickFilters,
    label: string,
    icon: string,
  ) => (
    <TouchableOpacity
      key={key}
      style={[styles.quickFilter, quickFilters[key] && styles.quickFilterActive]}
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
        <View style={styles.realDataBanner}>
          <Ionicons name="checkmark-circle" size={16} color="#21C55D" />
          <Text style={styles.realDataText}>{dataSource}</Text>
          <Text style={styles.realDataSubtext}>Live Updates</Text>
        </View>
      )}

      {/* Simplified Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#8a8a8a" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by location or name"
            placeholderTextColor="#6a6a6a"
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity
            onPress={() => setShowFilters(true)}
            style={styles.filterIcon}
            activeOpacity={0.7}
          >
            <View style={styles.filterIconBadge}>
              <Ionicons name="filter" size={20} color="#D4AF37" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Quick Filters - Horizontal Scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickFiltersScroll}
          contentContainerStyle={styles.quickFiltersContent}
        >
          {renderQuickFilter("immediate", "Available Now", "flash")}
          {renderQuickFilter("free", "Free", "gift")}
          {renderQuickFilter("veterans", "Veterans", "shield-checkmark")}
          {renderQuickFilter("families", "Families", "people")}
          {renderQuickFilter("nearMe", "Near Me", "location")}
        </ScrollView>
      </View>

      {/* Map View */}
      {!showListView && (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            customMapStyle={MAP_DARK_STYLE}
            initialRegion={mapRegion}
            onRegionChangeComplete={(region) => {
              mapPerf.start();
              setMapRegion(region);
              mapPerf.end();
            }}
            showsUserLocation
            showsMyLocationButton={false}
          >
            {listings.map((listing, index) => (
              <Marker
                key={listing.id}
                coordinate={listing.coordinates}
                onPress={() => handleMarkerPress(index)}
              >
                <View
                  style={[
                    styles.mapMarker,
                    listing.availability === "available"
                      ? styles.markerAvailable
                      : styles.markerFull,
                    activeIndex === index && styles.markerActive,
                  ]}
                >
                  <Text style={styles.markerText}>
                    {listing.price.isFree ? "FREE" : `$${listing.price.min}`}
                  </Text>
                </View>
              </Marker>
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
        </View>
      )}

      {/* List View */}
      {showListView && (
        <Animated.View
          style={[
            styles.listViewContainer,
            {
              opacity: slideAnim,
              transform: [{
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              }],
            },
          ]}
        >
          <FlatList
            ref={listRef}
            data={listings}
            renderItem={renderListItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
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
                <Text style={styles.resultsCount}>{listings.length} places</Text>
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

        {/* Mini Card Preview (Map View Only) */}
        {!showListView && listings[activeIndex] && (
          <TouchableOpacity
            style={styles.miniCard}
            onPress={() => openDetails(listings[activeIndex])}
            activeOpacity={0.9}
          >
            <View style={styles.miniCardContent}>
              <Text style={styles.miniCardTitle} numberOfLines={1}>
                {listings[activeIndex].name}
              </Text>
              <Text style={styles.miniCardAddress} numberOfLines={1}>
                {listings[activeIndex].address.street}, {listings[activeIndex].address.city}
              </Text>
              <View style={styles.miniCardFooter}>
                <Text style={styles.miniCardPrice}>
                  {listings[activeIndex].price.isFree ? 'FREE' : `$${listings[activeIndex].price.min}/mo`}
                </Text>
                <View style={styles.miniCardBadge}>
                  <Text style={styles.miniCardBadgeText}>
                    {listings[activeIndex].availability === 'available'
                      ? `${listings[activeIndex].bedsAvailable} beds`
                      : 'Full'}
                  </Text>
                </View>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#D4AF37" />
          </TouchableOpacity>
        )}
      </View>

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
  realDataBanner: {
    position: "absolute",
    top: 50,
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
    top: 90,
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
  listViewContainer: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  listContent: {
    paddingTop: 140,
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
  listItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    flex: 1,
    marginRight: 8,
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
  miniCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
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
    backgroundColor: "#21C55D",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  miniCardBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
