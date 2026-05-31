import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
  Alert,
  ActionSheetIOS,
  Platform,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MapView, Marker } from "../../components/MapView";
import PhotoCarousel from "../../components/patterns/PhotoCarousel";
import Badge from "../../components/ui/Badge";
import { colors, spacing, radius } from "../../theme/tokens";
import { supabase } from "../../lib/supabase";
import {
  blockUser,
  unblockUser,
  hasBlockedUser,
} from "../../services/blockingService";
import { messageService } from "../../services/messageService";
import {
  parseAmenities,
  parseServices,
  parseRules,
  parseEligibility,
} from "../../constants/listingOptions";
import { useSavedListings } from "../../hooks/useSavedItems";
import { useAuthStore } from "../../state/useAuthStore";
import { isOSMListing } from "../../utils/listingHelpers";

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
  const [providerProfile, setProviderProfile] = useState<{
    full_name: string;
    avatar_url: string | null;
  } | null>(null);
  const [checkingApplication, setCheckingApplication] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [loadingBlockStatus, setLoadingBlockStatus] = useState(true);

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
            "id,title,description,amenities,services,rules,eligibility,images,address,city,state,zip_code,lat,lng,provider_id",
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
      providerId: listingFromParams.provider_id || null,
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
      contact: listingFromParams.contact || null,
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
      providerId: (dbListing as any).provider_id ?? base.providerId,
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

  // Fetch provider's name and avatar once we know their ID
  useEffect(() => {
    const providerId = merged.providerId;
    if (!providerId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", providerId)
        .maybeSingle();
      if (!cancelled && data) setProviderProfile(data);
    })();
    return () => { cancelled = true; };
  }, [merged.providerId]);

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

  // Get auth state
  const { user } = useAuthStore();

  // Load block status
  useEffect(() => {
    async function loadBlockStatus() {
      // Skip block check for OSM listings (community resources)
      if (isOSMListing(merged.providerId)) {
        setLoadingBlockStatus(false);
        return;
      }

      if (!merged.providerId || !user || merged.providerId === user.id) {
        setLoadingBlockStatus(false);
        return;
      }

      setLoadingBlockStatus(true);
      const blocked = await hasBlockedUser(merged.providerId);
      setIsBlocked(blocked);
      setLoadingBlockStatus(false);
    }

    loadBlockStatus();
  }, [merged.providerId, user]);

  // Bookmark functionality
  const { isSaved: isListingSaved, toggleSave, isSaving } = useSavedListings();

  // Ensure listingId is a string, not an object
  const listingId =
    typeof merged.id === "string"
      ? merged.id
      : (merged.id as any)?.toString?.() || String(merged.id);

  const isSaved = listingId ? isListingSaved(listingId) : false;

  const handleBack = () => (navigation as any).goBack?.();

  const handleSave = useCallback(async () => {
    if (!listingId || isSaving) return;
    try {
      await toggleSave(listingId);
    } catch (error) {
      console.error("Error toggling save status:", error);
    }
  }, [listingId, toggleSave, isSaving]);

  const handleApply = useCallback(async () => {
    // Prevent multiple clicks
    if (checkingApplication) {
      return;
    }

    console.log("🔵 Apply Now clicked");
    console.log("User:", user);
    console.log("Listing ID:", merged.id);
    console.log("Merged object:", merged);

    if (!user) {
      console.log("❌ No user - navigating to sign in");
      // Navigate to sign in if not authenticated
      // @ts-ignore
      navigation.navigate("Auth", { screen: "SignIn" });
      return;
    }

    if (!merged.id) {
      console.error("❌ No listing ID available!");
      return;
    }

    setCheckingApplication(true);

    // Check for existing application before allowing to proceed
    try {
      const { getExistingApplication } =
        await import("../../services/application.service");
      const existingApp = await getExistingApplication(merged.id);

      if (existingApp.exists && !existingApp.canResubmit) {
        // User already has an active application
        Alert.alert(
          "Application Already Exists",
          existingApp.message ||
            "You already have an active application for this listing.",
          [
            {
              text: "View My Applications",
              onPress: () => {
                // @ts-ignore
                navigation.navigate("ApplicationsList");
              },
            },
            {
              text: "OK",
              style: "cancel",
            },
          ],
        );
        return;
      }

      if (existingApp.exists && existingApp.canResubmit) {
        // User has a rejected/withdrawn application - allow resubmission
        Alert.alert(
          "Previous Application Found",
          existingApp.message ||
            "You can submit a new application for this listing.",
          [
            {
              text: "Continue",
              onPress: () => {
                console.log(
                  "✅ Navigating to ApplyWizard with listingId:",
                  merged.id,
                );
                // @ts-ignore
                navigation.navigate("ApplyWizard", { listingId: merged.id });
              },
            },
            {
              text: "Cancel",
              style: "cancel",
            },
          ],
        );
        return;
      }

      // No existing application - proceed normally
      console.log("✅ Navigating to ApplyWizard with listingId:", merged.id);
      // @ts-ignore
      navigation.navigate("ApplyWizard", { listingId: merged.id });
    } catch (error) {
      console.error("Error checking existing application:", error);
      // On error, allow them to proceed (will be checked again in wizard)
      console.log("⚠️ Proceeding despite error - will check again in wizard");
      // @ts-ignore
      navigation.navigate("ApplyWizard", { listingId: merged.id });
    } finally {
      setCheckingApplication(false);
    }
  }, [navigation, merged.id, user, checkingApplication]);

  // Handle 3-dot menu
  const handleOptionsMenu = useCallback(() => {
    if (!merged.providerId || !user || merged.providerId === user.id) {
      return;
    }

    const blockOption = isBlocked ? "Unblock Provider" : "Block Provider";
    const providerName = merged.providerName || "this provider";

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", blockOption],
          destructiveButtonIndex: isBlocked ? undefined : 1,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleBlockUnblock();
          }
        },
      );
    } else {
      // Android - show Alert with options
      Alert.alert("Options", `Choose an action for ${providerName}`, [
        {
          text: blockOption,
          style: isBlocked ? "default" : "destructive",
          onPress: () => handleBlockUnblock(),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]);
    }
  }, [merged.providerId, merged.providerName, user, isBlocked]);

  // Handle message provider
  const handleMessageProvider = useCallback(async () => {
    if (!user) {
      Alert.alert("Sign In Required", "Please sign in to message providers");
      return;
    }

    if (!merged.providerId) {
      Alert.alert("Error", "Provider information not available");
      return;
    }

    try {
      // Initialize message service if needed
      await messageService.initialize(user.id);

      // Create or get existing thread with this provider
      const thread = await messageService.createThread(
        [merged.providerId],
        merged.title ? `Re: ${merged.title}` : "New message",
        merged.id, // listingId
      );

      // Navigate to the thread with all expected params
      (navigation as any).navigate("Thread", {
        threadId: thread.id,
        participantId: merged.providerId,
        propertyTitle: merged.title,
        senderName: merged.providerName,
      });
    } catch (error) {
      console.error("Error creating message thread:", error);
      Alert.alert("Error", "Failed to start conversation. Please try again.");
    }
  }, [
    user,
    merged.providerId,
    merged.title,
    merged.providerName,
    merged.id,
    navigation,
  ]);

  // Handle block/unblock
  const handleBlockUnblock = useCallback(async () => {
    if (!merged.providerId) return;

    const providerName = merged.providerName || "this provider";

    if (isBlocked) {
      // Unblock
      Alert.alert(
        "Unblock Provider",
        `Unblock ${providerName}? You'll be able to see their listings again.`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Unblock",
            onPress: async () => {
              const result = await unblockUser(merged.providerId);
              if (result.success) {
                setIsBlocked(false);
                Alert.alert("Unblocked", `${providerName} has been unblocked.`);
              } else {
                Alert.alert(
                  "Error",
                  result.error || "Failed to unblock provider",
                );
              }
            },
          },
        ],
      );
    } else {
      // Block
      Alert.alert(
        "Block Provider",
        `Block ${providerName}? You won't see their listings anymore and they won't be able to contact you.`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Block",
            style: "destructive",
            onPress: async () => {
              const result = await blockUser(merged.providerId);
              if (result.success) {
                setIsBlocked(true);
                Alert.alert(
                  "Provider Blocked",
                  `${providerName} has been blocked. You won't see their listings anymore.`,
                  [
                    {
                      text: "OK",
                      onPress: () => navigation.goBack(),
                    },
                  ],
                );
              } else {
                Alert.alert(
                  "Error",
                  result.error || "Failed to block provider",
                );
              }
            },
          },
        ],
      );
    }
  }, [merged.providerId, merged.providerName, isBlocked, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>

        {merged.providerId && user && merged.providerId !== user.id && !isOSMListing(merged.providerId) && (
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={handleOptionsMenu}
            disabled={loadingBlockStatus}
          >
            <Ionicons name="ellipsis-vertical" size={24} color={colors.white} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{merged.title || "Listing"}</Text>

          {/* Provider card — shows avatar + name */}
          {merged.providerId && (
            <View style={styles.providerCard}>
              {providerProfile?.avatar_url ? (
                <Image
                  source={{ uri: providerProfile.avatar_url }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitial}>
                    {(providerProfile?.full_name || merged.providerName || "?")[0].toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.providerInfo}>
                <Text style={styles.providerName}>
                  {providerProfile?.full_name || merged.providerName || "Provider"}
                </Text>
                {merged.isVerified && <Badge text="Verified" />}
                {isOSMListing(merged.id) && <Badge text="Community Resource" />}
              </View>
            </View>
          )}
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
                {(() => {
                  const { address, city, state, zip } = merged.location || {};

                  // If address is the placeholder text, skip it
                  const street = address === "Address not available" ? "" : address;

                  // Only show state if it's not the placeholder
                  const stateText = state === "State" ? "" : state;

                  // Only show zip if it's not the placeholder
                  const zipText = zip === "00000" ? "" : zip;

                  // Build address parts, filtering out empty values
                  const parts = [street, city, stateText, zipText].filter(Boolean);

                  // If we have at least city, show it
                  if (parts.length > 0) {
                    return parts.join(", ");
                  }

                  // Fallback if everything is missing
                  return "Location details available by phone";
                })()}
              </Text>
            </>
          )}
        </CollapsibleSection>

        {isOSMListing(merged.id) && (merged as any).contact && (
          <CollapsibleSection title="Contact Information" defaultExpanded>
            <View style={styles.contactInfoContainer}>
              {(merged as any).contact.phone && (
                <View style={styles.contactItem}>
                  <Ionicons name="call" size={20} color={colors.gold} />
                  <Text style={styles.contactLabel}>Phone:</Text>
                  <Text style={styles.contactValue}>{(merged as any).contact.phone}</Text>
                </View>
              )}
              {(merged as any).contact.email && (
                <View style={styles.contactItem}>
                  <Ionicons name="mail" size={20} color={colors.gold} />
                  <Text style={styles.contactLabel}>Email:</Text>
                  <Text style={styles.contactValue}>{(merged as any).contact.email}</Text>
                </View>
              )}
              {(merged as any).contact.website && (
                <View style={styles.contactItem}>
                  <Ionicons name="globe" size={20} color={colors.gold} />
                  <Text style={styles.contactLabel}>Website:</Text>
                  <Text style={styles.contactLink}>{(merged as any).contact.website}</Text>
                </View>
              )}
              {(merged as any).contact.hours && (
                <View style={styles.contactItem}>
                  <Ionicons name="time" size={20} color={colors.gold} />
                  <Text style={styles.contactLabel}>Hours:</Text>
                  <Text style={styles.contactValue}>{(merged as any).contact.hours}</Text>
                </View>
              )}
            </View>
          </CollapsibleSection>
        )}

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
        {merged.providerId && user && merged.providerId !== user.id && !isOSMListing(merged.providerId) && (
          <TouchableOpacity
            style={styles.messageButton}
            onPress={handleMessageProvider}
          >
            <Ionicons
              name="chatbubble-outline"
              size={20}
              color={colors.white}
            />
            <Text style={styles.messageButtonText}>Message</Text>
          </TouchableOpacity>
        )}
        {!isOSMListing(merged.id) ? (
          <TouchableOpacity
            style={[
              styles.applyButton,
              checkingApplication && styles.applyButtonDisabled,
            ]}
            onPress={handleApply}
            disabled={checkingApplication}
          >
            {checkingApplication ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.applyButtonText}>Apply Now</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.osmInfoContainer}>
            <Ionicons name="information-circle" size={20} color={colors.gold} />
            <Text style={styles.osmInfoText}>
              This is a community resource. Please contact the shelter directly using the information above.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    position: "absolute",
    top: 40,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 140 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.gold,
    marginBottom: spacing.xs,
  },
  providerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.darkGray,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.darkGray,
    borderWidth: 1,
    borderColor: colors.gold,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.gold,
  },
  providerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  providerName: { fontSize: 15, fontWeight: "600", color: colors.white },
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
  messageButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.white,
    justifyContent: "center",
  },
  messageButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.white,
  },
  applyButton: {
    flex: 1,
    height: 48,
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  applyButtonDisabled: {
    opacity: 0.7,
  },
  applyButtonText: { fontSize: 16, fontWeight: "bold", color: colors.black },
  osmInfoContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.darkGray,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  osmInfoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: colors.gray[300],
  },
  contactInfoContainer: {
    gap: spacing.md,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  contactLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.gray[300],
    minWidth: 70,
  },
  contactValue: {
    flex: 1,
    fontSize: 14,
    color: colors.white,
  },
  contactLink: {
    flex: 1,
    fontSize: 14,
    color: colors.gold,
    textDecorationLine: "underline",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: 14,
    color: colors.gray[400],
  },
});
