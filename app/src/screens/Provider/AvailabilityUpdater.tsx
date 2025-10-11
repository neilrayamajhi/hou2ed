import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Linking } from "react-native";
import { colors, spacing, typography, radius } from "../../theme/tokens";
import InlineCounter from "../../components/patterns/InlineCounter";
import { RootStackNavigationProp } from "../../navigation/types";
import { useProviderListings } from "../../hooks/useProviderListings";
import { updateListing } from "../../services/listing.service";
import { useToast } from "../../components/ui/Toast";
import { useQueryClient } from "@tanstack/react-query";

interface Property {
  id: string;
  title: string;
  address: string;
  totalBeds: number;
  availableBeds: number;
  lastUpdated: Date;
}

function formatLastUpdated(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (hours < 1) {
    return "Just now";
  } else if (hours < 24) {
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  } else {
    return `${days} day${days > 1 ? "s" : ""} ago`;
  }
}

function isStale(date: Date): boolean {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = diff / (1000 * 60 * 60);
  return hours > 48;
}

export default function AvailabilityUpdater() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { data: listings, isLoading } = useProviderListings();
  const [properties, setProperties] = useState<Property[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [changedMap, setChangedMap] = useState<Record<string, number>>({});
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Hydrate local state from live listings when loaded
  useEffect(() => {
    if (!isLoading && listings) {
      const mapped: Property[] = listings.map((l) => ({
        id: l.id,
        title: l.title,
        address: l.address,
        totalBeds: l.totalBeds,
        availableBeds: l.availableBeds,
        lastUpdated: new Date(l.lastUpdated),
      }));
      setProperties(mapped);
      setChangedMap({});
      setHasChanges(false);
    }
  }, [isLoading, listings]);

  // Check if any property is stale
  const hasStaleData = useMemo(() => {
    return properties.some((property) => isStale(property.lastUpdated));
  }, [properties]);

  // Handle deep linking
  useEffect(() => {
    const handleDeepLink = (url: string) => {
      if (url.includes("provider/update")) {
        // Already on this screen, could refresh data
        console.log("Deep link to provider update");
      }
    };

    const subscription = Linking.addEventListener("url", (event: { url: string }) => {
      handleDeepLink(event.url);
    });

    // Check if app was opened with a deep link
    Linking.getInitialURL().then((url: string | null) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleIncrement = useCallback((propertyId: string) => {
    setProperties((prev) =>
      prev.map((p) => {
        if (p.id === propertyId && p.availableBeds < p.totalBeds) {
          setHasChanges(true);
          const newVal = p.availableBeds + 1;
          setChangedMap((m) => ({ ...m, [propertyId]: newVal }));
          return { ...p, availableBeds: newVal };
        }
        return p;
      })
    );
  }, []);

  const handleDecrement = useCallback((propertyId: string) => {
    setProperties((prev) =>
      prev.map((p) => {
        if (p.id === propertyId && p.availableBeds > 0) {
          setHasChanges(true);
          const newVal = p.availableBeds - 1;
          setChangedMap((m) => ({ ...m, [propertyId]: newVal }));
          return { ...p, availableBeds: newVal };
        }
        return p;
      })
    );
  }, []);

  const handleConfirmNoChange = useCallback(() => {
    const now = new Date();
    setProperties((prev) =>
      prev.map((p) => {
        if (isStale(p.lastUpdated)) {
          return { ...p, lastUpdated: now };
        }
        return p;
      })
    );
    Alert.alert("Updated", "All properties marked as current");
  }, []);

  const handleSaveAll = useCallback(async () => {
    if (!hasChanges && !hasStaleData) {
      Alert.alert("No Changes", "No updates to save");
      return;
    }

    setIsSaving(true);
    try {
      // Persist only changed availableBeds values
      const entries = Object.entries(changedMap);
      if (entries.length > 0) {
        await Promise.all(
          entries.map(([id, beds]) => updateListing(id, { availableBeds: beds }))
        );
      }

      // Optimistically mark lastUpdated as now
      const now = new Date();
      setProperties((prev) => prev.map((p) => ({ ...p, lastUpdated: now })));
      setChangedMap({});
      setHasChanges(false);
      showToast("Availability updated", "success");
      await queryClient.invalidateQueries({ queryKey: ["providerListings"] });
    } catch (e: any) {
      showToast(e?.message || "Failed to save availability", "error");
    } finally {
      setIsSaving(false);
    }
  }, [hasChanges, hasStaleData]);

  const renderPropertyRow = useCallback((property: Property) => {
    const isPropertyStale = isStale(property.lastUpdated);

    return (
      <View
        key={property.id}
        style={[
          styles.propertyRow,
          isPropertyStale && styles.stalePropertyRow,
        ]}
      >
        <View style={styles.propertyInfo}>
          <Text style={styles.propertyTitle}>{property.title}</Text>
          <Text style={styles.propertyAddress} numberOfLines={1}>
            {property.address}
          </Text>
          <Text
            style={[
              styles.lastUpdated,
              isPropertyStale && styles.staleLastUpdated,
            ]}
          >
            Updated {formatLastUpdated(property.lastUpdated)}
          </Text>
        </View>

        <View style={styles.counterSection}>
          <Text style={styles.bedsLabel}>Available beds</Text>
          <InlineCounter
            value={property.availableBeds}
            onIncrement={() => handleIncrement(property.id)}
            onDecrement={() => handleDecrement(property.id)}
            min={0}
            max={property.totalBeds}
          />
          <Text style={styles.totalBeds}>of {property.totalBeds} total</Text>
        </View>
      </View>
    );
  }, [handleIncrement, handleDecrement]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={colors.gray[50]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Update Availability</Text>
        <View style={styles.headerSpacer} />
      </View>

      {hasStaleData && (
        <View style={styles.staleBanner}>
          <Ionicons name="warning-outline" size={20} color={colors.gray[900]} />
          <View style={styles.staleBannerContent}>
            <Text style={styles.staleBannerTitle}>Data may be stale</Text>
            <Text style={styles.staleBannerText}>
              Some properties haven't been updated in over 48 hours
            </Text>
          </View>
          <TouchableOpacity
            style={styles.staleBannerButton}
            onPress={handleConfirmNoChange}
            accessibilityLabel="Confirm no changes"
            accessibilityRole="button"
          >
            <Text style={styles.staleBannerButtonText}>Confirm no change</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Your Properties</Text>

        {properties.map(renderPropertyRow)}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Quick tip: Update availability daily to help seekers find housing
          </Text>
        </View>
      </ScrollView>

      {/* Sticky Save Button */}
      <View style={styles.saveButtonContainer}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            (!hasChanges && !hasStaleData) && styles.saveButtonDisabled,
          ]}
          onPress={handleSaveAll}
          disabled={isSaving || (!hasChanges && !hasStaleData)}
          accessibilityLabel="Save all changes"
          accessibilityRole="button"
        >
          {isSaving ? (
            <>
              <Ionicons name="sync" size={20} color={colors.gray[900]} />
              <Text style={styles.saveButtonText}>Saving...</Text>
            </>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={colors.gray[900]} />
              <Text style={styles.saveButtonText}>Save All</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[900],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[800],
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.sizes.lg,
    fontWeight: "600",
    color: colors.gray[50],
    textAlign: "center",
  },
  headerSpacer: {
    width: 32,
  },
  staleBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.amber,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  staleBannerContent: {
    flex: 1,
  },
  staleBannerTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.gray[900],
  },
  staleBannerText: {
    fontSize: typography.sizes.xs,
    color: colors.gray[800],
    marginTop: 2,
  },
  staleBannerButton: {
    backgroundColor: colors.gray[900],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  staleBannerButtonText: {
    fontSize: typography.sizes.xs,
    fontWeight: "500",
    color: colors.amber,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for sticky button
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.gray[400],
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  propertyRow: {
    backgroundColor: colors.gray[850],
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stalePropertyRow: {
    borderWidth: 1,
    borderColor: colors.amber,
  },
  propertyInfo: {
    flex: 1,
    marginRight: spacing.lg,
  },
  propertyTitle: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.gray[50],
    marginBottom: spacing.xs,
  },
  propertyAddress: {
    fontSize: typography.sizes.sm,
    color: colors.gray[400],
    marginBottom: spacing.xs,
  },
  lastUpdated: {
    fontSize: typography.sizes.xs,
    color: colors.gray[500],
  },
  staleLastUpdated: {
    color: colors.amber,
    fontWeight: "500",
  },
  counterSection: {
    alignItems: "center",
  },
  bedsLabel: {
    fontSize: typography.sizes.xs,
    color: colors.gray[400],
    marginBottom: spacing.xs,
  },
  totalBeds: {
    fontSize: typography.sizes.xs,
    color: colors.gray[500],
    marginTop: spacing.xs,
  },
  footer: {
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  footerText: {
    fontSize: typography.sizes.sm,
    color: colors.gray[500],
    textAlign: "center",
    fontStyle: "italic",
  },
  saveButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.gray[900],
    borderTopWidth: 1,
    borderTopColor: colors.gray[800],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: spacing.xl,
  },
  saveButton: {
    backgroundColor: colors.primary[500],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  saveButtonDisabled: {
    backgroundColor: colors.gray[700],
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.gray[900],
  },
});
