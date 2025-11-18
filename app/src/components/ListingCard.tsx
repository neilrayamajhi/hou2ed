import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme";
import type { Listing } from "../types/listing";

const { width: screenWidth } = Dimensions.get("window");
const CARD_WIDTH = screenWidth * 0.85;
const CARD_HEIGHT = 200;

interface ListingCardProps {
  listing: Listing;
  onPress?: () => void;
  isActive?: boolean;
}

export default function ListingCard({
  listing,
  onPress,
  isActive = false,
}: ListingCardProps) {
  const getAvailabilityColor = () => {
    if (listing.availability.beds_today > 0) {
      return "#21C55D"; // available
    } else if (listing.availability.waitlist > 0) {
      return "#F59E0B"; // waitlist
    } else {
      return "#374151"; // full
    }
  };

  const getAvailabilityText = () => {
    if (listing.availability.beds_today > 0) {
      return `${listing.availability.beds_today} beds available`;
    } else if (listing.availability.waitlist > 0) {
      return "Waitlist open";
    } else {
      return "Currently full";
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, isActive && styles.activeContainer]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Cover Image - Only show if available */}
      {listing.images?.[0] ? (
        <Image
          source={{
            uri: listing.images[0],
          }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Ionicons name="home-outline" size={32} color="#4B5563" />
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.name} numberOfLines={1}>
              {listing.title}
            </Text>
            <Text style={styles.provider} numberOfLines={1}>
              {listing.provider?.full_name || "Provider"}
            </Text>
          </View>
          {listing.verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={20} color={"#D4AF37"} />
            </View>
          )}
        </View>

        {/* Info Row */}
        <View style={styles.infoRow}>
          {/* Distance */}
          {listing.distance !== undefined && (
            <View style={styles.infoItem}>
              <Ionicons name="location-outline" size={14} color={"#4B5563"} />
              <Text style={styles.infoText}>
                {listing.distance.toFixed(1)} mi
              </Text>
            </View>
          )}

          {/* Price */}
          <View style={styles.infoItem}>
            <Ionicons name="cash-outline" size={14} color={"#4B5563"} />
            <Text style={styles.infoText}>
              {listing.cost?.free
                ? "Free"
                : listing.cost?.monthly
                  ? `$${listing.cost.monthly}/mo`
                  : "Contact"}
            </Text>
          </View>
        </View>

        {/* Features */}
        <View style={styles.features}>
          {listing.eligibility?.family_status?.includes("family") && (
            <View style={styles.featureChip}>
              <Text style={styles.featureText}>Families</Text>
            </View>
          )}
          {listing.eligibility?.veterans && (
            <View style={styles.featureChip}>
              <Text style={styles.featureText}>Veterans</Text>
            </View>
          )}
          {listing.accessibility?.mobility &&
            listing.accessibility.mobility.length > 0 && (
              <View style={styles.featureChip}>
                <Text style={styles.featureText}>Accessible</Text>
              </View>
            )}
          {listing.rules?.pets === "allowed" && (
            <View style={styles.featureChip}>
              <Text style={styles.featureText}>Pets OK</Text>
            </View>
          )}
        </View>

        {/* Availability */}
        <View style={styles.footer}>
          <View
            style={[
              styles.availabilityBadge,
              { backgroundColor: getAvailabilityColor() },
            ]}
          >
            <Text style={styles.availabilityText}>{getAvailabilityText()}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: "#1F2937",
    borderRadius: theme.borderRadius.lg,
    marginHorizontal: 10,
    flexDirection: "row",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#374151",
  },
  activeContainer: {
    borderColor: "#D4AF37",
    borderWidth: 2,
  },
  image: {
    width: CARD_WIDTH * 0.35,
    height: "100%",
  },
  imagePlaceholder: {
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    padding: theme.spacing.md,
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLeft: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  name: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: "#FFFFFF",
    marginBottom: 2,
  },
  provider: {
    fontSize: theme.typography.fontSize.xs,
    color: "#4B5563",
  },
  verifiedBadge: {
    padding: 2,
  },
  infoRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  infoText: {
    fontSize: theme.typography.fontSize.xs,
    color: "#4B5563",
  },
  features: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  featureChip: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    backgroundColor: "#000000",
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: "#374151",
  },
  featureText: {
    fontSize: theme.typography.fontSize.xs,
    color: "#FFFFFF",
  },
  footer: {
    marginTop: theme.spacing.sm,
  },
  availabilityBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    alignSelf: "flex-start",
  },
  availabilityText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    color: "#000000",
  },
});
