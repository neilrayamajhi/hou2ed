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
import { theme } from "../../theme";
import Badge from "../../components/ui/Badge";
import {
  PLACEHOLDER_IMAGE,
  FACILITY_BADGES,
  type FacilityBadgeType,
} from "../../utils/constants";

const { width: screenWidth } = Dimensions.get("window");
const CARD_WIDTH = screenWidth * 0.85;
const CARD_HEIGHT = 200;

interface ListingCardProps {
  coverUri?: string;
  title: string;
  type: string;
  neighborhood: string;
  cost: string | number;
  availableCount?: number;
  verified?: boolean;
  badges?: FacilityBadgeType[];
  intakeHours?: string;
  phone?: string;
  onPress?: () => void;
  isActive?: boolean;
}

const ListingCard = React.memo(function ListingCard({
  coverUri,
  title,
  type,
  neighborhood,
  cost,
  availableCount = 0,
  verified = false,
  badges = [],
  intakeHours,
  phone,
  onPress,
  isActive = false,
}: ListingCardProps) {
  const getCostDisplay = () => {
    if (cost === 0 || cost === "Free" || cost === "free") {
      return "Free";
    }
    if (typeof cost === "number") {
      return `$${cost}`;
    }
    return cost;
  };

  const getFacilityBadgeLabel = (badge: FacilityBadgeType): string => {
    return FACILITY_BADGES[badge] || badge;
  };

  const getFacilityIntake = () => {
    if (!intakeHours && !phone) return null;

    const parts = [];
    if (intakeHours) parts.push(`Intake: ${intakeHours}`);
    if (phone) parts.push(phone);
    return parts.join(" • ");
  };

  const facilityInfo = getFacilityIntake();

  return (
    <TouchableOpacity
      style={[styles.container, isActive && styles.activeContainer]}
      onPress={onPress}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${type} in ${neighborhood}, ${getCostDisplay()}, ${
        availableCount > 0
          ? `${availableCount} beds available`
          : "Check availability"
      }`}
    >
      {/* Cover Image with gold frame */}
      <View style={styles.imageContainer}>
        <Image
          source={{
            uri: coverUri || PLACEHOLDER_IMAGE,
          }}
          style={styles.image}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Title & Verified Badge */}
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {verified && (
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={"#D4AF37"}
              style={styles.verifiedIcon}
            />
          )}
        </View>

        {/* Type & Neighborhood */}
        <Text style={styles.type} numberOfLines={1}>
          {type}
        </Text>
        <Text style={styles.neighborhood} numberOfLines={1}>
          {neighborhood} " {getCostDisplay()}
        </Text>

        {/* Facility Badges */}
        {badges.length > 0 && (
          <View style={styles.badgesRow}>
            {badges.map((badge) => (
              <Badge key={badge} type="facility">
                {getFacilityBadgeLabel(badge)}
              </Badge>
            ))}
          </View>
        )}

        {/* Availability Badge */}
        <View style={styles.footer}>
          {availableCount > 0 ? (
            <Badge type="available">
              {availableCount} {availableCount === 1 ? "Bed" : "Beds"} Today
            </Badge>
          ) : (
            <Badge type="full">No Beds Available</Badge>
          )}
        </View>

        {/* Facility Info (intake hours, phone) */}
        {facilityInfo && (
          <Text style={styles.facilityInfo} numberOfLines={1}>
            {facilityInfo}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
});

export default ListingCard;

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    minHeight: CARD_HEIGHT,
    backgroundColor: "#000000",
    borderRadius: theme.borderRadius.lg,
    marginHorizontal: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#D4AF37",
  },
  activeContainer: {
    borderWidth: 2,
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  imageContainer: {
    width: "100%",
    height: 140,
    borderBottomWidth: 1,
    borderBottomColor: "#D4AF37",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  content: {
    padding: theme.spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.xs,
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: "#D4AF37",
    flex: 1,
  },
  verifiedIcon: {
    marginLeft: theme.spacing.xs,
  },
  type: {
    fontSize: theme.typography.fontSize.sm,
    color: "#4B5563",
    marginBottom: 2,
  },
  neighborhood: {
    fontSize: theme.typography.fontSize.md,
    color: "#FFFFFF",
    marginBottom: theme.spacing.sm,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: theme.spacing.xs,
  },
  facilityInfo: {
    fontSize: theme.typography.fontSize.xs,
    color: "#FFFFFF",
    marginTop: theme.spacing.sm,
    fontStyle: "italic",
  },
});
