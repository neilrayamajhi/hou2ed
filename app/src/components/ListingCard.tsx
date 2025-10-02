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
    switch (listing.availability) {
      case "available":
        return "#21C55D";
      case "waitlist":
        return "#F59E0B";
      case "full":
        return "#374151";
      default:
        return "#4B5563";
    }
  };

  const getAvailabilityText = () => {
    switch (listing.availability) {
      case "available":
        return `${listing.bedsAvailable} beds available`;
      case "waitlist":
        return "Waitlist open";
      case "full":
        return "Currently full";
      default:
        return "Check availability";
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, isActive && styles.activeContainer]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Cover Image */}
      <Image
        source={{ uri: listing.coverImage || "https://via.placeholder.com/400x300" }}
        style={styles.image}
        resizeMode="cover"
      />

      {/* Content */}
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.name} numberOfLines={1}>
              {listing.name}
            </Text>
            <Text style={styles.provider} numberOfLines={1}>
              {listing.provider}
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
              <Ionicons
                name="location-outline"
                size={14}
                color={"#4B5563"}
              />
              <Text style={styles.infoText}>{listing.distance.toFixed(1)} mi</Text>
            </View>
          )}

          {/* Price */}
          <View style={styles.infoItem}>
            <Ionicons
              name="cash-outline"
              size={14}
              color={"#4B5563"}
            />
            <Text style={styles.infoText}>
              {listing.price.isFree ? "Free" : `$${listing.price.min}-${listing.price.max}`}
            </Text>
          </View>

          {/* Rating */}
          {listing.rating && (
            <View style={styles.infoItem}>
              <Ionicons name="star" size={14} color={"#D4AF37"} />
              <Text style={styles.infoText}>{listing.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>

        {/* Features */}
        <View style={styles.features}>
          {listing.features.acceptsFamilies && (
            <View style={styles.featureChip}>
              <Text style={styles.featureText}>Families</Text>
            </View>
          )}
          {listing.features.acceptsVeterans && (
            <View style={styles.featureChip}>
              <Text style={styles.featureText}>Veterans</Text>
            </View>
          )}
          {listing.features.wheelchairAccessible && (
            <View style={styles.featureChip}>
              <Text style={styles.featureText}>Accessible</Text>
            </View>
          )}
          {listing.features.petsAllowed && (
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