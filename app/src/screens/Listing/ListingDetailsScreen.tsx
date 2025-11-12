import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MapView, Marker } from "../../components/MapView";
import PhotoCarousel from "../../components/patterns/PhotoCarousel";
import Badge from "../../components/ui/Badge";
import { colors, spacing, radius } from "../../theme/tokens";
import { supabase } from "../../lib/supabase";
import {
  parseAmenities,
  parseServices,
  parseRules,
  parseEligibility,
} from "../../constants/listingOptions";
import { useSavedListings } from "../../hooks/useSavedItems";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function CollapsibleSection({
  title,
  children,
  defaultExpanded = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.7}
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

function toStringArray(v: any): string[] {
  try {
    if (Array.isArray(v)) return v.filter(Boolean).map(String);
    if (v && typeof v === "object") {
      return Object.entries(v as Record<string, any>)
        .filter(([, val]) => !!val)
        .map(([key]) => String(key));
    }
    if (typeof v === "string" && v.trim()) return [v.trim()];
  } catch {}
  return [];
}

function normalizeImageUrls(input: any): string[] {
  const arr = Array.isArray(input) ? input : input ? [input] : [];
  return arr
    .filter(Boolean)
    .map((u: any) => {
      const s = String(u).trim();
      // Drop any bad entries that include a device file path
      if (s.includes("file://")) return "";
      if (/^https?:\/\//i.test(s)) return s;
      // If looks like a storage path, convert to public URL
      try {
        const { data } = supabase.storage
          .from("listing-images")
          .getPublicUrl(s);
        return data.publicUrl || s;
      } catch {
        return s;
      }
    })
    .filter((u: string) => !!u && /^https?:\/\//i.test(u));
}

export default function ListingDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const listingFromParams = route.params?.listing || {};

  // Support both route.params.listing.id AND route.params.listingId
  const routeListingId = route.params?.listingId || listingFromParams?.id;

  console.log("[ListingDetails] Route params:", {
    listingId: route.params?.listingId,
    hasListing: !!route.params?.listing,
    listingId_from_listing: listingFromParams?.id,
    resolved: routeListingId,
  });

  const [dbListing, setDbListing] = useState<any>(null);
  const [loadingDb, setLoadingDb] = useState(false);

  useEffect(() => {
    const id = routeListingId;
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingDb(true);
        const { data, error } = await supabase
          .from("listings")
          .select(
            "id,title,description,amenities,services,rules,eligibility,images,address,city,state,zip_code,lat,lng",
          )
          .eq("id", id)
          .maybeSingle();
        if (!cancelled) {
          if (error)
            console.warn("Failed to fetch listing by id:", error.message);
          setDbListing(data || null);
        }
      } finally {
        if (!cancelled) setLoadingDb(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [routeListingId]);

  const merged = useMemo(() => {
    const base = {
      id: routeListingId || listingFromParams.id,
      title: listingFromParams.name || listingFromParams.title || "",
      providerName: listingFromParams.provider || "",
      isVerified: !!listingFromParams.verified,
      isDVSensitive: !!listingFromParams.isDVSensitive,
      images: normalizeImageUrls(
        listingFromParams.images ||
          (listingFromParams.coverImage ? [listingFromParams.coverImage] : []),
      ),
      bedsAvailable: listingFromParams.bedsAvailable ?? 0,
      bedsTotal: listingFromParams.bedsTotal ?? 0,
      costPerMonth:
        listingFromParams.price?.min ?? listingFromParams.price ?? 0,
      intakeMethod: listingFromParams.intakeMethod || "",
      lastUpdated: listingFromParams.lastUpdated || "",
      overview:
        listingFromParams.overview || listingFromParams.description || "",
      amenities: listingFromParams.amenities ?? [],
      services: listingFromParams.services ?? [],
      rules: listingFromParams.rules ?? [],
      eligibility: listingFromParams.eligibility ?? [],
      location: {
        latitude:
          listingFromParams.coordinates?.latitude ?? listingFromParams.lat,
        longitude:
          listingFromParams.coordinates?.longitude ?? listingFromParams.lng,
        address: listingFromParams.address?.street ?? listingFromParams.address,
        city: listingFromParams.address?.city ?? listingFromParams.city,
        state: listingFromParams.address?.state ?? listingFromParams.state,
        zip: listingFromParams.address?.zipCode ?? listingFromParams.zip,
      },
    };

    if (!dbListing) return base;
    return {
      ...base,
      title: dbListing.title || base.title,
      overview: dbListing.description || base.overview,
      amenities: dbListing.amenities ?? base.amenities,
      services: dbListing.services ?? base.services,
      rules: dbListing.rules ?? base.rules,
      eligibility: dbListing.eligibility ?? base.eligibility,
      images: normalizeImageUrls(dbListing.images ?? base.images),
      location: {
        latitude: (dbListing as any).lat ?? base.location.latitude,
        longitude: (dbListing as any).lng ?? base.location.longitude,
        address: dbListing.address ?? base.location.address,
        city: dbListing.city ?? base.location.city,
        state: dbListing.state ?? base.location.state,
        zip: (dbListing as any).zip_code ?? base.location.zip,
      },
    };
  }, [listingFromParams, dbListing, routeListingId]);

  // Use the new parsing functions that convert codes to nice labels
  const amenitiesList = parseAmenities(merged.amenities);
  const servicesList = parseServices(merged.services);
  const rulesList = parseRules(merged.rules);
  const eligibilityList = parseEligibility(merged.eligibility);

  // Images are already normalized in the merged object
  const imageUrls: string[] = merged.images;
  // TEMP debug to verify what seeker sees
  try {
    // eslint-disable-next-line no-console
    console.log("[ListingDetails] raw images:", (merged as any).images);
    // eslint-disable-next-line no-console
    console.log("[ListingDetails] imageUrls:", imageUrls);
  } catch {}

  // Bookmark functionality
  const { isSaved: isListingSaved, toggleSave, isSaving } = useSavedListings();

  // Ensure listingId is a string, not an object
  const listingId =
    typeof merged.id === "string"
      ? merged.id
      : (merged.id as any)?.toString?.() || String(merged.id);

  const isSaved = listingId ? isListingSaved(listingId) : false;

  const handleBack = () => (navigation as any).goBack?.();

  const handleSave = async () => {
    if (!listingId || typeof listingId !== "string") {
      console.error("[ListingDetails] Cannot save: invalid listing ID", {
        listingId,
        type: typeof listingId,
        mergedId: merged.id,
      });
      return;
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(listingId)) {
      console.error("[ListingDetails] Invalid UUID format", { listingId });
      return;
    }

    try {
      console.log("[ListingDetails] Saving listing", { listingId });
      await toggleSave(listingId);
      console.log("[ListingDetails] Listing saved successfully");
    } catch (error) {
      console.error("[ListingDetails] Save listing error:", error);
    }
  };

  const handleApply = () => {};

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
        <Ionicons name="arrow-back" size={24} color={colors.white} />
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{merged.title || "Listing"}</Text>
          <View style={styles.providerRow}>
            {merged.isVerified && <Badge text="Verified" />}
            {!!merged.providerName && (
              <Text style={styles.providerName}>{merged.providerName}</Text>
            )}
          </View>
        </View>

        {/* Always render the carousel; it shows a nice placeholder when empty */}
        <PhotoCarousel images={imageUrls} />

        <CollapsibleSection title="Overview" defaultExpanded>
          {loadingDb ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.gold} />
              <Text style={styles.loadingText}>Loading details…</Text>
            </View>
          ) : (
            <Text style={styles.bodyText}>
              {merged.overview || "No overview provided."}
            </Text>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Amenities">
          {loadingDb ? (
            <ActivityIndicator size="small" color={colors.gold} />
          ) : (
            <View style={styles.tagContainer}>
              {amenitiesList.map((amenity, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{amenity}</Text>
                </View>
              ))}
              {amenitiesList.length === 0 && (
                <Text style={styles.bodyText}>Not provided</Text>
              )}
            </View>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Services">
          {loadingDb ? (
            <ActivityIndicator size="small" color={colors.gold} />
          ) : (
            <View style={styles.listContainer}>
              {servicesList.map((service, i) => (
                <View key={i} style={styles.listItem}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={colors.gold}
                  />
                  <Text style={styles.listText}>{service}</Text>
                </View>
              ))}
              {servicesList.length === 0 && (
                <Text style={styles.bodyText}>Not provided</Text>
              )}
            </View>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Rules & Eligibility">
          {loadingDb ? (
            <ActivityIndicator size="small" color={colors.gold} />
          ) : (
            <>
              <Text style={styles.subheading}>House Rules</Text>
              <View style={styles.listContainer}>
                {rulesList.map((rule, i) => (
                  <View key={i} style={styles.listItem}>
                    <Text style={styles.bulletPoint}>-</Text>
                    <Text style={styles.listText}>{rule}</Text>
                  </View>
                ))}
                {rulesList.length === 0 && (
                  <Text style={styles.bodyText}>Not provided</Text>
                )}
              </View>

              <Text style={[styles.subheading, { marginTop: spacing.lg }]}>
                Eligibility Requirements
              </Text>
              <View style={styles.listContainer}>
                {eligibilityList.map((req, i) => (
                  <View key={i} style={styles.listItem}>
                    <Text style={styles.bulletPoint}>-</Text>
                    <Text style={styles.listText}>{req}</Text>
                  </View>
                ))}
                {eligibilityList.length === 0 && (
                  <Text style={styles.bodyText}>Not provided</Text>
                )}
              </View>
            </>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Location">
          {merged.isDVSensitive ? (
            <View style={styles.sensitiveLocation}>
              <Ionicons name="lock-closed" size={24} color={colors.gold} />
              <Text style={styles.sensitiveLocationText}>
                Sensitive location - hidden for safety
              </Text>
            </View>
          ) : (
            <>
              {merged.location?.latitude && merged.location?.longitude ? (
                <View style={styles.mapContainer}>
                  <MapView
                    style={styles.map}
                    initialRegion={{
                      latitude: merged.location.latitude,
                      longitude: merged.location.longitude,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }}
                  >
                    <Marker
                      coordinate={{
                        latitude: merged.location.latitude!,
                        longitude: merged.location.longitude!,
                      }}
                    />
                  </MapView>
                </View>
              ) : null}
              <Text style={styles.addressText}>
                {merged.location?.address} {merged.location?.city}{" "}
                {merged.location?.state} {merged.location?.zip}
              </Text>
            </>
          )}
        </CollapsibleSection>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Ionicons
              name={isSaved ? "bookmark" : "bookmark-outline"}
              size={24}
              color={colors.white}
            />
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
          <Text style={styles.applyButtonText}>Apply Now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  backBtn: { position: "absolute", top: 40, left: 16, zIndex: 10 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 140 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
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
    flexWrap: "wrap",
  },
  providerName: { fontSize: 16, color: colors.white },
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
  sectionTitle: { fontSize: 18, fontWeight: "600", color: colors.gold },
  sectionContent: { paddingBottom: spacing.md },
  bodyText: { fontSize: 14, lineHeight: 20, color: colors.white },
  subheading: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.gold,
    marginBottom: spacing.sm,
  },
  tagContainer: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  tag: {
    backgroundColor: colors.black,
    borderWidth: 1,
    borderColor: colors.white,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  tagText: { fontSize: 12, color: colors.white },
  listContainer: { gap: spacing.sm },
  listItem: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  listText: { fontSize: 14, color: colors.white, flex: 1 },
  bulletPoint: { fontSize: 14, color: colors.gold, width: 15 },
  mapContainer: { marginTop: spacing.sm },
  map: {
    width: SCREEN_WIDTH - spacing.lg * 2,
    height: 200,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  addressText: { fontSize: 14, color: colors.white },
  sensitiveLocation: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.darkGray,
    borderRadius: radius.md,
  },
  sensitiveLocationText: { fontSize: 14, color: colors.gold },
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
  applyButtonText: { fontSize: 16, fontWeight: "bold", color: colors.black },
});
