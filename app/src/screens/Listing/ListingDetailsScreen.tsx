import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { MapView, Marker } from "../../components/MapView";
import PhotoCarousel from "../../components/patterns/PhotoCarousel";
import Badge from "../../components/ui/Badge";
import { colors, spacing, radius } from "../../theme/tokens";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Mock data for the listing
const mockListing = {
  id: "1",
  title: "Safe Haven Recovery House",
  providerName: "Hope Foundation",
  isVerified: true,
  isDVSensitive: false,
  images: [
    "https://via.placeholder.com/400x300/1a1a1a/D4AF37?text=House+Front",
    "https://via.placeholder.com/400x300/1a1a1a/D4AF37?text=Living+Room",
    "https://via.placeholder.com/400x300/1a1a1a/D4AF37?text=Bedroom",
    "https://via.placeholder.com/400x300/1a1a1a/D4AF37?text=Kitchen",
  ],
  bedsAvailable: 3,
  bedsTotal: 8,
  costPerMonth: 650,
  intakeMethod: "Call first",
  lastUpdated: "2 hours ago",
  overview: "A supportive transitional housing program focused on recovery and reintegration. We provide a structured environment with peer support and case management services. Our residents typically stay 6-12 months while working on their recovery goals.",
  amenities: [
    "WiFi",
    "Laundry",
    "Kitchen access",
    "Computer lab",
    "Group meeting space",
    "Parking",
    "Wheelchair accessible",
    "Pet friendly (ESA only)",
  ],
  services: [
    "Case management",
    "Group therapy",
    "Job placement assistance",
    "Life skills training",
    "Medication management",
    "Transportation vouchers",
  ],
  rules: [
    "No alcohol or drugs",
    "Curfew 10 PM weekdays, midnight weekends",
    "Mandatory house meetings",
    "Weekly drug testing",
    "Must be employed or in treatment",
    "30-day probation period",
  ],
  eligibility: [
    "18+ years old",
    "In recovery (min 30 days clean)",
    "Valid ID required",
    "Income verification",
    "Background check required",
    "No violent felonies",
  ],
  location: {
    latitude: 34.0522,
    longitude: -118.2437,
    address: "1234 Recovery Way",
    city: "Los Angeles",
    state: "CA",
    zip: "90001",
  },
};

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

function CollapsibleSection({
  title,
  children,
  defaultExpanded = false,
}: CollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${title} section, ${expanded ? "expanded" : "collapsed"}`}
      >
        <Text style={styles.sectionTitle}>{title}</Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={colors.gold}
        />
      </TouchableOpacity>
      {expanded && <View style={styles.sectionContent}>{children}</View>}
    </View>
  );
}

export default function ListingDetailsScreen() {
  const navigation = useNavigation();
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = useCallback(() => {
    setIsSaved(!isSaved);
  }, [isSaved]);

  const handleApply = useCallback(() => {
    // Navigate to application flow
    // @ts-ignore
    navigation.navigate("ApplyWizard", { listingId: mockListing.id });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Photo Carousel */}
        <PhotoCarousel images={mockListing.images} height={250} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{mockListing.title}</Text>
          <View style={styles.providerRow}>
            <Text style={styles.providerName}>{mockListing.providerName}</Text>
            {mockListing.isVerified && (
              <Badge type="verified" label="Verified" />
            )}
          </View>
        </View>

        {/* Quick Stats Row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statsRow}
        >
          <View style={[styles.statCard, mockListing.bedsAvailable > 0 && styles.statCardAvailable]}>
            <Ionicons
              name="bed-outline"
              size={20}
              color={mockListing.bedsAvailable > 0 ? colors.green : colors.gold}
            />
            <Text style={[styles.statValue, mockListing.bedsAvailable > 0 && styles.statValueAvailable]}>
              {mockListing.bedsAvailable}/{mockListing.bedsTotal}
            </Text>
            <Text style={styles.statLabel}>Beds</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="cash-outline" size={20} color={colors.gold} />
            <Text style={styles.statValue}>${mockListing.costPerMonth}</Text>
            <Text style={styles.statLabel}>Per month</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="call-outline" size={20} color={colors.gold} />
            <Text style={styles.statValue}>{mockListing.intakeMethod}</Text>
            <Text style={styles.statLabel}>Intake</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="time-outline" size={20} color={colors.gold} />
            <Text style={styles.statValue}>{mockListing.lastUpdated}</Text>
            <Text style={styles.statLabel}>Updated</Text>
          </View>
        </ScrollView>

        {/* Collapsible Sections */}
        <CollapsibleSection title="Overview" defaultExpanded={true}>
          <Text style={styles.bodyText}>{mockListing.overview}</Text>
        </CollapsibleSection>

        <CollapsibleSection title="Amenities">
          <View style={styles.tagContainer}>
            {mockListing.amenities.map((amenity, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{amenity}</Text>
              </View>
            ))}
          </View>
        </CollapsibleSection>

        <CollapsibleSection title="Services">
          <View style={styles.listContainer}>
            {mockListing.services.map((service, index) => (
              <View key={index} style={styles.listItem}>
                <Ionicons name="checkmark-circle" size={16} color={colors.gold} />
                <Text style={styles.listText}>{service}</Text>
              </View>
            ))}
          </View>
        </CollapsibleSection>

        <CollapsibleSection title="Rules & Eligibility">
          <Text style={styles.subheading}>House Rules</Text>
          <View style={styles.listContainer}>
            {mockListing.rules.map((rule, index) => (
              <View key={index} style={styles.listItem}>
                <Text style={styles.bulletPoint}>•</Text>
                <Text style={styles.listText}>{rule}</Text>
              </View>
            ))}
          </View>

          <Text style={[styles.subheading, { marginTop: spacing.lg }]}>
            Eligibility Requirements
          </Text>
          <View style={styles.listContainer}>
            {mockListing.eligibility.map((req, index) => (
              <View key={index} style={styles.listItem}>
                <Text style={styles.bulletPoint}>•</Text>
                <Text style={styles.listText}>{req}</Text>
              </View>
            ))}
          </View>
        </CollapsibleSection>

        <CollapsibleSection title="Location">
          {mockListing.isDVSensitive ? (
            <View style={styles.sensitiveLocation}>
              <Ionicons name="lock-closed" size={24} color={colors.gold} />
              <Text style={styles.sensitiveLocationText}>
                Sensitive location — hidden for safety
              </Text>
            </View>
          ) : (
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: mockListing.location.latitude,
                  longitude: mockListing.location.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                customMapStyle={darkMapStyle}
              >
                <Marker
                  coordinate={{
                    latitude: mockListing.location.latitude,
                    longitude: mockListing.location.longitude,
                  }}
                  pinColor={colors.gold}
                />
              </MapView>
              <Text style={styles.addressText}>
                {mockListing.location.address}, {mockListing.location.city},{" "}
                {mockListing.location.state} {mockListing.location.zip}
              </Text>
            </View>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Reviews">
          <View style={styles.reviewsPlaceholder}>
            <Ionicons name="star-outline" size={32} color={colors.gray} />
            <Text style={styles.placeholderText}>Reviews coming soon</Text>
          </View>
        </CollapsibleSection>

        {/* Bottom padding for sticky bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={isSaved ? "Remove from saved" : "Save listing"}
        >
          <Ionicons
            name={isSaved ? "bookmark" : "bookmark-outline"}
            size={24}
            color={colors.white}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.applyButton}
          onPress={handleApply}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Apply now"
        >
          <Text style={styles.applyButtonText}>Apply Now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// Dark map style
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#212121" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ color: "#757575" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#757575" }],
  },
  {
    featureType: "road",
    elementType: "geometry.fill",
    stylers: [{ color: "#2c2c2c" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#000000" }],
  },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    padding: spacing.lg,
    paddingBottom: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.gold,
    marginBottom: spacing.xs,
  },
  providerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  providerName: {
    fontSize: 16,
    color: colors.white,
  },
  statsRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  statCard: {
    backgroundColor: colors.black,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius.md,
    padding: spacing.md,
    marginRight: spacing.sm,
    minWidth: 100,
    alignItems: "center",
  },
  statCardAvailable: {
    borderColor: colors.green,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.white,
    marginTop: spacing.xs,
  },
  statValueAvailable: {
    color: colors.green,
  },
  statLabel: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 2,
  },
  section: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.gold,
  },
  sectionContent: {
    paddingBottom: spacing.md,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.white,
  },
  subheading: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.gold,
    marginBottom: spacing.sm,
  },
  tagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  tag: {
    backgroundColor: colors.black,
    borderWidth: 1,
    borderColor: colors.white,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  tagText: {
    fontSize: 12,
    color: colors.white,
  },
  listContainer: {
    gap: spacing.sm,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  listText: {
    fontSize: 14,
    color: colors.white,
    flex: 1,
  },
  bulletPoint: {
    fontSize: 14,
    color: colors.gold,
    width: 15,
  },
  mapContainer: {
    marginTop: spacing.sm,
  },
  map: {
    width: SCREEN_WIDTH - spacing.lg * 2,
    height: 200,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  addressText: {
    fontSize: 14,
    color: colors.white,
  },
  sensitiveLocation: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.darkGray,
    borderRadius: radius.md,
  },
  sensitiveLocationText: {
    fontSize: 14,
    color: colors.gold,
  },
  reviewsPlaceholder: {
    alignItems: "center",
    padding: spacing.xl,
  },
  placeholderText: {
    fontSize: 14,
    color: colors.gray,
    marginTop: spacing.sm,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.black,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
    padding: spacing.lg,
    paddingBottom: spacing.lg + 20,
    gap: spacing.md,
  },
  saveButton: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.white,
    justifyContent: "center",
    alignItems: "center",
  },
  applyButton: {
    flex: 1,
    height: 48,
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.black,
  },
});