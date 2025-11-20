import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AddressAutocompleteClean, {
  type AddressData,
} from "../../components/forms/AddressAutocompleteClean";
import MapView, { Marker } from "react-native-maps";
import { colors, spacing, typography, radius } from "../../theme/tokens";
import { RootStackNavigationProp } from "../../navigation/types";
import { useToast } from "../../components/ui/Toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createListing,
  getCurrentProviderId,
} from "../../services/listing.service";
import * as ImagePicker from "expo-image-picker";
// Use clean uploader that works on all platforms
import { uploadListingImageClean as uploadListingImage } from "../../services/storage.clean.service";
import { useRequireProvider } from "../../hooks/useRequireProvider";

type StepKey =
  | "Basics"
  | "Location"
  | "Photos"
  | "AmenitiesRules"
  | "Pricing"
  | "Availability"
  | "Review";

export default function ListingWizard() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  useRequireProvider();

  const steps: StepKey[] = [
    "Basics",
    "Location",
    "Photos",
    "AmenitiesRules",
    "Pricing",
    "Availability",
    "Review",
  ];

  // Map step keys to display titles
  const stepTitles: Record<StepKey, string> = {
    Basics: "Basics",
    Location: "Location",
    Photos: "Photos",
    AmenitiesRules: "Amenities & Rules",
    Pricing: "Pricing",
    Availability: "Availability",
    Review: "Review",
  };
  const [stepIndex, setStepIndex] = useState(0);

  // Form state (MVP subset)
  const [title, setTitle] = useState("");
  const [overview, setOverview] = useState("");
  const [address, setAddress] = useState("");
  const [locationSel, setLocationSel] = useState<AddressData | null>(null);
  const [totalBeds, setTotalBeds] = useState("");
  const [availableBeds, setAvailableBeds] = useState("");
  const [price, setPrice] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [availabilityDays, setAvailabilityDays] = useState<
    Record<string, number>
  >({});

  // Amenities state
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [customAmenities, setCustomAmenities] = useState("");

  // Services state
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [customServices, setCustomServices] = useState("");

  // Rules state
  const [curfew, setCurfew] = useState("");
  const [visitorsPolicy, setVisitorsPolicy] = useState("");
  const [petsPolicy, setPetsPolicy] = useState<
    "allowed" | "not_allowed" | "service_only"
  >("not_allowed");
  const [customRules, setCustomRules] = useState("");

  // Eligibility state
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [selectedEligibility, setSelectedEligibility] = useState<string[]>([]);
  const [customEligibility, setCustomEligibility] = useState("");

  // Required documents state
  const [requiredDocuments, setRequiredDocuments] = useState<string[]>([]);
  const [newDocumentName, setNewDocumentName] = useState("");

  const { mutate: submit, isPending } = useMutation({
    mutationFn: async () => {
      const providerId = await getCurrentProviderId();
      if (!providerId) throw new Error("You must be logged in as a provider");
      const totalBedsNum = Number(totalBeds);
      const availableBedsNum = availableBeds
        ? Number(availableBeds)
        : undefined;

      // Validate bed counts
      if (availableBedsNum !== undefined && availableBedsNum > totalBedsNum) {
        throw new Error(
          `Available beds (${availableBedsNum}) cannot exceed total beds (${totalBedsNum}). Please correct this before saving.`,
        );
      }

      const priceNum = price ? Number(price) : undefined;
      // Prepare custom fields (split by comma or newline)
      const customAmenitiesArray = customAmenities
        .split(/[,\n]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const customServicesArray = customServices
        .split(/[,\n]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const customRulesArray = customRules
        .split(/[,\n]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const customEligibilityArray = customEligibility
        .split(/[,\n]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      const created = await createListing(providerId, {
        title: title.trim(),
        description:
          overview && overview.trim().length > 0 ? overview.trim() : undefined,
        address: (locationSel?.street || address).trim(),
        city: locationSel?.city,
        state: locationSel?.state,
        zip_code: locationSel?.zipCode,
        totalBeds: totalBedsNum,
        availableBeds: availableBedsNum,
        price: priceNum,
        coordinates: locationSel
          ? { lat: locationSel.latitude, lng: locationSel.longitude }
          : undefined,
        amenities: selectedAmenities.length > 0 ? selectedAmenities : undefined,
        customAmenities:
          customAmenitiesArray.length > 0 ? customAmenitiesArray : undefined,
        services: selectedServices.length > 0 ? selectedServices : undefined,
        customServices:
          customServicesArray.length > 0 ? customServicesArray : undefined,
        curfew: curfew.trim() || undefined,
        visitorsPolicy: visitorsPolicy.trim() || undefined,
        petsPolicy: petsPolicy !== "not_allowed" ? petsPolicy : undefined,
        customRules: customRulesArray.length > 0 ? customRulesArray : undefined,
        minAge: minAge ? Number(minAge) : undefined,
        maxAge: maxAge ? Number(maxAge) : undefined,
        eligibility:
          selectedEligibility.length > 0 ? selectedEligibility : undefined,
        customEligibility:
          customEligibilityArray.length > 0
            ? customEligibilityArray
            : undefined,
        requiredDocuments:
          requiredDocuments.length > 0 ? requiredDocuments : undefined,
      });
      // If photos selected and created successfully, upload and attach
      if (created.success && created.listingId) {
        // Upload photos if any
        if (photos.length > 0) {
          const urls: string[] = [];
          for (const uri of photos) {
            const res = await uploadListingImage(uri, created.listingId, {
              resize: "full",
            });
            if (res.success && res.url) urls.push(res.url);
          }
          if (urls.length > 0) {
            const { updateListing } = await import(
              "../../services/listing.service"
            );
            const res = await updateListing(created.listingId, {
              images: urls,
            });
            if (!res.success) {
              console.warn(
                "[ListingWizard] Failed to persist images:",
                res.error,
              );
            }
          } else if (photos.length > 0 && urls.length === 0) {
            // All uploads failed — avoid saving file:// paths by not writing images
            console.warn(
              "[ListingWizard] All photo uploads failed; not saving images field",
            );
          }
        }
        // Persist per-day availability (calendar) if provided
        if (Object.keys(availabilityDays).length > 0) {
          const { updateListing } = await import(
            "../../services/listing.service"
          );
          await updateListing(created.listingId, { availabilityDays });
        }
      }
      return created;
    },
    onSuccess: async (res) => {
      if (!res.success) {
        showToast(res.error || "Failed to create listing", "error");
        return;
      }
      showToast("Listing published successfully!", "success");
      // Invalidate cache so dashboard will refetch listings
      queryClient.invalidateQueries({ queryKey: ["providerListings"] });
      // Navigate back to the tabs and select the Dashboard tab
      navigation.navigate("Tabs", { screen: "Dashboard" });
    },
    onError: (e: any) =>
      showToast(e?.message || "Failed to create listing", "error"),
  });

  const currentStep = steps[stepIndex];
  const progress = useMemo(
    () => (stepIndex + 1) / steps.length,
    [stepIndex, steps.length],
  );

  const next = () => {
    if (currentStep === "Basics") {
      if (!title.trim() || !totalBeds) {
        Alert.alert("Missing info", "Title and total beds are required");
        return;
      }
    }
    if (currentStep === "Location") {
      if (!locationSel) {
        Alert.alert(
          "Missing address",
          "Please select an address and location.",
        );
        return;
      }
    }
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  };
  const back = () => setStepIndex((i) => Math.max(i - 1, 0));

  const renderBasics = () => (
    <View>
      <Text style={styles.label}>Property name *</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Haven House"
        placeholderTextColor={colors.gray[500]}
      />

      <Text style={styles.label}>Overview (optional)</Text>
      <TextInput
        style={[styles.input, { height: 100, textAlignVertical: "top" }]}
        value={overview}
        onChangeText={setOverview}
        placeholder="Describe your program, services, and who you support."
        placeholderTextColor={colors.gray[500]}
        multiline
      />

      {/* Address moved to Location step */}

      <Text style={styles.label}>Total beds *</Text>
      <TextInput
        style={styles.input}
        value={totalBeds}
        onChangeText={setTotalBeds}
        keyboardType="number-pad"
        placeholder="e.g. 12"
        placeholderTextColor={colors.gray[500]}
      />
      <Text style={styles.helper}>Maximum capacity of your shelter</Text>

      <Text style={[styles.label, { marginTop: spacing.md }]}>
        Available beds (today)
      </Text>
      <TextInput
        style={styles.input}
        value={availableBeds}
        onChangeText={setAvailableBeds}
        keyboardType="number-pad"
        placeholder="e.g. 3"
        placeholderTextColor={colors.gray[500]}
      />
      <Text style={styles.helper}>
        How many beds are open right now? You can update this anytime from your
        dashboard.
      </Text>
    </View>
  );

  const renderLocation = () => (
    <View>
      <Text style={styles.helper}>
        We’ll geocode address server-side later.
      </Text>
    </View>
  );
  const renderPhotos = () => (
    <View>
      <View style={styles.photosRow}>
        {photos.map((uri) => (
          <View key={uri} style={styles.photoItem}>
            <Image source={{ uri }} style={styles.photo} />
            <TouchableOpacity
              style={styles.removeBadge}
              onPress={() => setPhotos((prev) => prev.filter((p) => p !== uri))}
              accessibilityLabel="Remove photo"
            >
              <Ionicons name="close" size={14} color={colors.gray[900]} />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity
          style={[styles.photoItem, styles.addPhoto]}
          onPress={async () => {
            const perm =
              await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (perm.status !== "granted") {
              Alert.alert(
                "Permission needed",
                "Please allow photo library access",
              );
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: false,
              quality: 0.9,
            });
            if (!result.canceled) {
              const uri = result.assets?.[0]?.uri;
              if (uri) setPhotos((prev) => [...prev, uri]);
            }
          }}
          accessibilityLabel="Add photo"
        >
          <Ionicons name="add" size={24} color={colors.gray[500]} />
          <Text style={{ color: colors.gray[400], marginTop: 4 }}>
            Add photo
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.helper, { marginTop: spacing.sm }]}>
        Add a few photos to make your listing stand out.
      </Text>
    </View>
  );
  const toggleArrayItem = (
    array: string[],
    setArray: React.Dispatch<React.SetStateAction<string[]>>,
    item: string,
  ) => {
    if (array.includes(item)) {
      setArray(array.filter((i) => i !== item));
    } else {
      setArray([...array, item]);
    }
  };

  // New richer Location step UI (address + map)
  const renderLocation2 = () => (
    <View style={{ gap: spacing.lg }}>
      <View>
        <Text style={styles.label}>Address & Location *</Text>
        <Text style={styles.sectionDescription}>
          Search for your address, then confirm the pin on the map.
        </Text>
      </View>

      {/* Search card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Search for an address</Text>
        <AddressAutocompleteClean
          onAddressSelect={(addr) => setLocationSel(addr)}
          placeholder="Start typing..."
        />
      </View>

      {/* Selected address card */}
      {locationSel ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Selected address</Text>
          <Text style={{ color: colors.gray[100], fontWeight: "600" }}>
            {locationSel.street}
          </Text>
          <Text style={{ color: colors.gray[400], marginTop: 4 }}>
            {locationSel.city}, {locationSel.state} {locationSel.zipCode}
          </Text>
        </View>
      ) : (
        <Text style={styles.helper}>No address selected yet.</Text>
      )}

      {/* Map preview */}
      {locationSel && (
        <View
          style={{
            borderRadius: radius.md,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: colors.gray[800],
          }}
        >
          <MapView
            style={{ height: 240, width: "100%" }}
            initialRegion={{
              latitude: locationSel.latitude,
              longitude: locationSel.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
          >
            <Marker
              coordinate={{
                latitude: locationSel.latitude,
                longitude: locationSel.longitude,
              }}
            />
          </MapView>
        </View>
      )}
    </View>
  );

  const renderAmenities = () => {
    const amenitiesOptions = [
      { label: "Wi-Fi", value: "wifi" },
      { label: "Laundry", value: "laundry" },
      { label: "Kitchen", value: "kitchen" },
      { label: "Meals Provided", value: "meals" },
      { label: "Showers", value: "showers" },
      { label: "Storage Lockers", value: "storage" },
      { label: "Common Area", value: "common_area" },
      { label: "Air Conditioning", value: "ac" },
      { label: "Heating", value: "heating" },
    ];

    const servicesOptions = [
      { label: "Case Management", value: "case_management" },
      { label: "Medical Services", value: "medical" },
      { label: "Mental Health Services", value: "mental_health" },
      { label: "Substance Abuse Services", value: "substance_abuse" },
      { label: "Job Training", value: "job_training" },
      { label: "Education Support", value: "education" },
      { label: "Transportation Assistance", value: "transportation" },
      { label: "Legal Aid", value: "legal" },
    ];

    const eligibilityOptions = [
      { label: "All Genders Welcome", value: "all_genders" },
      { label: "Men Only", value: "men_only" },
      { label: "Women Only", value: "women_only" },
      { label: "Families Welcome", value: "families" },
      { label: "Veterans Welcome", value: "veterans" },
      { label: "LGBTQ+ Friendly", value: "lgbtq" },
      { label: "Youth (18-24)", value: "youth" },
      { label: "Seniors (55+)", value: "seniors" },
    ];

    return (
      <ScrollView>
        {/* Amenities Section */}
        <Text style={styles.sectionTitle}>Amenities</Text>
        <Text style={styles.sectionDescription}>
          Select the amenities available at your facility
        </Text>
        <View style={styles.chipGrid}>
          {amenitiesOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.chip,
                selectedAmenities.includes(option.value) && styles.chipSelected,
              ]}
              onPress={() =>
                toggleArrayItem(
                  selectedAmenities,
                  setSelectedAmenities,
                  option.value,
                )
              }
            >
              <Text
                style={[
                  styles.chipText,
                  selectedAmenities.includes(option.value) &&
                    styles.chipTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { marginTop: spacing.md }]}>
          Other Amenities (Optional)
        </Text>
        <TextInput
          style={[styles.input, { height: 80, textAlignVertical: "top" }]}
          value={customAmenities}
          onChangeText={setCustomAmenities}
          placeholder="e.g., Garden area, Pet-friendly outdoor space, Computer lab"
          placeholderTextColor={colors.gray[500]}
          multiline
        />

        {/* Services Section */}
        <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>
          Services
        </Text>
        <Text style={styles.sectionDescription}>
          Select the services you provide
        </Text>
        <View style={styles.chipGrid}>
          {servicesOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.chip,
                selectedServices.includes(option.value) && styles.chipSelected,
              ]}
              onPress={() =>
                toggleArrayItem(
                  selectedServices,
                  setSelectedServices,
                  option.value,
                )
              }
            >
              <Text
                style={[
                  styles.chipText,
                  selectedServices.includes(option.value) &&
                    styles.chipTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { marginTop: spacing.md }]}>
          Other Services (Optional)
        </Text>
        <TextInput
          style={[styles.input, { height: 80, textAlignVertical: "top" }]}
          value={customServices}
          onChangeText={setCustomServices}
          placeholder="e.g., Childcare, Language classes, Financial counseling"
          placeholderTextColor={colors.gray[500]}
          multiline
        />

        {/* Rules Section */}
        <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>
          Rules & Policies
        </Text>

        <Text style={styles.label}>Curfew</Text>
        <TextInput
          style={styles.input}
          value={curfew}
          onChangeText={setCurfew}
          placeholder="e.g. 10:00 PM or None"
          placeholderTextColor={colors.gray[500]}
        />

        <Text style={styles.label}>Visitor Policy</Text>
        <TextInput
          style={styles.input}
          value={visitorsPolicy}
          onChangeText={setVisitorsPolicy}
          placeholder="e.g. Visitors allowed 9AM-5PM or No visitors"
          placeholderTextColor={colors.gray[500]}
        />

        <Text style={styles.label}>Pet Policy</Text>
        <View style={styles.chipGrid}>
          <TouchableOpacity
            style={[
              styles.chip,
              petsPolicy === "allowed" && styles.chipSelected,
            ]}
            onPress={() => setPetsPolicy("allowed")}
          >
            <Text
              style={[
                styles.chipText,
                petsPolicy === "allowed" && styles.chipTextSelected,
              ]}
            >
              Pets Allowed
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.chip,
              petsPolicy === "service_only" && styles.chipSelected,
            ]}
            onPress={() => setPetsPolicy("service_only")}
          >
            <Text
              style={[
                styles.chipText,
                petsPolicy === "service_only" && styles.chipTextSelected,
              ]}
            >
              Service Animals Only
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.chip,
              petsPolicy === "not_allowed" && styles.chipSelected,
            ]}
            onPress={() => setPetsPolicy("not_allowed")}
          >
            <Text
              style={[
                styles.chipText,
                petsPolicy === "not_allowed" && styles.chipTextSelected,
              ]}
            >
              No Pets
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.label, { marginTop: spacing.md }]}>
          Other Rules (Optional)
        </Text>
        <TextInput
          style={[styles.input, { height: 80, textAlignVertical: "top" }]}
          value={customRules}
          onChangeText={setCustomRules}
          placeholder="e.g., No smoking indoors, Quiet hours 10PM-7AM, Must attend weekly meetings"
          placeholderTextColor={colors.gray[500]}
          multiline
        />

        {/* Eligibility Section */}
        <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>
          Who Can Apply
        </Text>
        <Text style={styles.sectionDescription}>
          Select who is eligible for your facility
        </Text>

        <Text style={styles.label}>Age Range (Optional)</Text>
        <View
          style={{
            flexDirection: "row",
            gap: spacing.md,
            marginBottom: spacing.lg,
          }}
        >
          <View style={{ flex: 1 }}>
            <TextInput
              style={styles.input}
              value={minAge}
              onChangeText={setMinAge}
              placeholder="Min age"
              keyboardType="number-pad"
              placeholderTextColor={colors.gray[500]}
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextInput
              style={styles.input}
              value={maxAge}
              onChangeText={setMaxAge}
              placeholder="Max age"
              keyboardType="number-pad"
              placeholderTextColor={colors.gray[500]}
            />
          </View>
        </View>

        <View style={styles.chipGrid}>
          {eligibilityOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.chip,
                selectedEligibility.includes(option.value) &&
                  styles.chipSelected,
              ]}
              onPress={() =>
                toggleArrayItem(
                  selectedEligibility,
                  setSelectedEligibility,
                  option.value,
                )
              }
            >
              <Text
                style={[
                  styles.chipText,
                  selectedEligibility.includes(option.value) &&
                    styles.chipTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { marginTop: spacing.md }]}>
          Other Eligibility Requirements (Optional)
        </Text>
        <TextInput
          style={[styles.input, { height: 80, textAlignVertical: "top" }]}
          value={customEligibility}
          onChangeText={setCustomEligibility}
          placeholder="e.g., Must have valid ID, Clean background check required, No active warrants"
          placeholderTextColor={colors.gray[500]}
          multiline
        />

        {/* Required Documents Section */}
        <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>
          Required Documents
        </Text>
        <Text style={styles.sectionDescription}>
          Add documents that applicants must upload when applying
        </Text>

        {/* List of required documents */}
        {requiredDocuments.length > 0 && (
          <View style={{ marginBottom: spacing.md }}>
            {requiredDocuments.map((doc, index) => (
              <View key={index} style={styles.documentItem}>
                <Text style={styles.documentName}>{doc}</Text>
                <TouchableOpacity
                  onPress={() =>
                    setRequiredDocuments(
                      requiredDocuments.filter((_, i) => i !== index),
                    )
                  }
                  style={styles.removeButton}
                >
                  <Ionicons
                    name="close-circle"
                    size={24}
                    color={colors.red[500]}
                  />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Add new document */}
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={newDocumentName}
            onChangeText={setNewDocumentName}
            placeholder="e.g., Cal Aid Form, Pay Stub, Veteran ID"
            placeholderTextColor={colors.gray[500]}
          />
          <TouchableOpacity
            style={[
              styles.addButton,
              !newDocumentName.trim() && styles.addButtonDisabled,
            ]}
            onPress={() => {
              if (newDocumentName.trim()) {
                setRequiredDocuments([
                  ...requiredDocuments,
                  newDocumentName.trim(),
                ]);
                setNewDocumentName("");
              }
            }}
            disabled={!newDocumentName.trim()}
          >
            <Ionicons
              name="add-circle"
              size={24}
              color={
                newDocumentName.trim() ? colors.primary[500] : colors.gray[600]
              }
            />
            <Text
              style={[
                styles.addButtonText,
                !newDocumentName.trim() && styles.addButtonTextDisabled,
              ]}
            >
              Add
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };
  const renderPricing = () => (
    <View>
      <Text style={styles.label}>Price per month ($)</Text>
      <TextInput
        style={styles.input}
        value={price}
        onChangeText={setPrice}
        keyboardType="number-pad"
        placeholder="e.g. 500 (leave empty if free)"
        placeholderTextColor={colors.gray[500]}
      />
    </View>
  );
  // Helpers for calendar
  const pad = (n: number) => String(n).padStart(2, "0");
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth()); // 0-11
  const firstOfMonth = new Date(calYear, calMonth, 1);
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const startWeekday = firstOfMonth.getDay(); // 0 Sun - 6 Sat
  const weeks: (number | null)[] = Array.from(
    { length: startWeekday },
    () => null,
  ).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));
  while (weeks.length % 7 !== 0) weeks.push(null);

  const changeDay = (day: number, delta: number) => {
    const key = `${calYear}-${pad(calMonth + 1)}-${pad(day)}`;
    const total = Number(totalBeds) || 0;
    setAvailabilityDays((prev) => {
      const current = prev[key] ?? 0;
      const next = Math.max(0, Math.min(total, current + delta));
      return { ...prev, [key]: next };
    });
  };

  const renderAvailability = () => (
    <View>
      <Text style={styles.sectionDescription}>
        Optional: Set specific bed availability for future dates. This helps
        seekers plan ahead and see when beds will open up. You can skip this and
        update availability daily from your dashboard instead.
      </Text>
      <View style={styles.calHeader}>
        <TouchableOpacity
          onPress={() => {
            let m = calMonth - 1;
            let y = calYear;
            if (m < 0) {
              m = 11;
              y -= 1;
            }
            setCalMonth(m);
            setCalYear(y);
          }}
          accessibilityLabel="Previous month"
        >
          <Ionicons name="chevron-back" size={20} color={colors.gray[200]} />
        </TouchableOpacity>
        <Text style={styles.calTitle}>
          {new Date(calYear, calMonth).toLocaleString(undefined, {
            month: "long",
            year: "numeric",
          })}
        </Text>
        <TouchableOpacity
          onPress={() => {
            let m = calMonth + 1;
            let y = calYear;
            if (m > 11) {
              m = 0;
              y += 1;
            }
            setCalMonth(m);
            setCalYear(y);
          }}
          accessibilityLabel="Next month"
        >
          <Ionicons name="chevron-forward" size={20} color={colors.gray[200]} />
        </TouchableOpacity>
      </View>
      <View style={styles.weekRow}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, idx) => (
          <Text key={`weekday-${idx}`} style={styles.weekday}>
            {d}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {weeks.map((day, idx) => {
          if (day === null)
            return <View key={`pad-${idx}`} style={styles.cellPad} />;
          const key = `${calYear}-${pad(calMonth + 1)}-${pad(day)}`;
          const val = availabilityDays[key] ?? 0;
          const max = Number(totalBeds) || 0;
          return (
            <View key={key} style={styles.cell}>
              <Text style={styles.cellDay}>{day}</Text>
              <Text style={styles.cellVal}>{val}</Text>
              <View style={styles.cellBtns}>
                <TouchableOpacity
                  accessibilityLabel="Decrement value"
                  onPress={() => changeDay(day, -1)}
                  disabled={val <= 0}
                >
                  <Ionicons
                    name="remove-circle"
                    size={18}
                    color={val > 0 ? colors.primary[500] : colors.gray[700]}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityLabel="Increment value"
                  onPress={() => changeDay(day, +1)}
                  disabled={val >= max}
                >
                  <Ionicons
                    name="add-circle"
                    size={18}
                    color={val < max ? colors.primary[500] : colors.gray[700]}
                  />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>
      <Text style={[styles.helper, { marginTop: spacing.sm }]}>
        Set per-day available beds. Max equals Total beds.
      </Text>
    </View>
  );
  const renderReview = () => {
    const calendarDaysSet = Object.keys(availabilityDays).length;
    return (
      <ScrollView>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        <Text style={styles.reviewItem}>
          <Text style={styles.reviewKey}>Name:</Text> {title || "-"}
        </Text>
        <Text style={styles.reviewItem}>
          <Text style={styles.reviewKey}>Address:</Text>{" "}
          {locationSel
            ? `${locationSel.street}, ${locationSel.city}, ${locationSel.state} ${locationSel.zipCode}`
            : address || "-"}
        </Text>
        {locationSel && (
          <View
            style={{
              marginTop: spacing.sm,
              borderRadius: radius.md,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: colors.gray[800],
            }}
          >
            <MapView
              style={{ height: 160, width: "100%" }}
              initialRegion={{
                latitude: locationSel.latitude,
                longitude: locationSel.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
            >
              <Marker
                coordinate={{
                  latitude: locationSel.latitude,
                  longitude: locationSel.longitude,
                }}
              />
            </MapView>
          </View>
        )}
        <Text style={styles.reviewItem}>
          <Text style={styles.reviewKey}>Total beds:</Text> {totalBeds || "-"}
        </Text>
        <Text style={styles.reviewItem}>
          <Text style={styles.reviewKey}>Available today:</Text>{" "}
          {availableBeds || totalBeds || "-"}
        </Text>
        <Text style={styles.reviewItem}>
          <Text style={styles.reviewKey}>Price:</Text>{" "}
          {price ? `$${price}/month` : "Free"}
        </Text>

        <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>
          Media
        </Text>
        <Text style={styles.reviewItem}>
          <Text style={styles.reviewKey}>Photos:</Text> {photos.length} uploaded
        </Text>
        <Text style={styles.reviewItem}>
          <Text style={styles.reviewKey}>Calendar:</Text>{" "}
          {calendarDaysSet > 0
            ? `${calendarDaysSet} days scheduled`
            : "Not set (using daily updates)"}
        </Text>

        <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>
          Amenities & Services
        </Text>
        <Text style={styles.reviewItem}>
          <Text style={styles.reviewKey}>Amenities:</Text>{" "}
          {selectedAmenities.length > 0
            ? selectedAmenities.length
            : "None selected"}
        </Text>
        <Text style={styles.reviewItem}>
          <Text style={styles.reviewKey}>Services:</Text>{" "}
          {selectedServices.length > 0
            ? selectedServices.length
            : "None selected"}
        </Text>

        <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>
          Rules & Policies
        </Text>
        <Text style={styles.reviewItem}>
          <Text style={styles.reviewKey}>Curfew:</Text>{" "}
          {curfew || "Not specified"}
        </Text>
        <Text style={styles.reviewItem}>
          <Text style={styles.reviewKey}>Visitors:</Text>{" "}
          {visitorsPolicy || "Not specified"}
        </Text>
        <Text style={styles.reviewItem}>
          <Text style={styles.reviewKey}>Pets:</Text>{" "}
          {petsPolicy === "allowed"
            ? "Allowed"
            : petsPolicy === "service_only"
              ? "Service Animals Only"
              : "Not Allowed"}
        </Text>

        <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>
          Eligibility
        </Text>
        <Text style={styles.reviewItem}>
          <Text style={styles.reviewKey}>Age Range:</Text>{" "}
          {minAge || maxAge
            ? `${minAge || "Any"} - ${maxAge || "Any"}`
            : "Any age"}
        </Text>
        <Text style={styles.reviewItem}>
          <Text style={styles.reviewKey}>Who Can Apply:</Text>{" "}
          {selectedEligibility.length > 0
            ? selectedEligibility.length + " criteria selected"
            : "Open to all"}
        </Text>
      </ScrollView>
    );
  };

  const body = () => {
    switch (currentStep) {
      case "Basics":
        return renderBasics();
      case "Location":
        return renderLocation2();
      case "Photos":
        return renderPhotos();
      case "AmenitiesRules":
        return renderAmenities();
      case "Pricing":
        return renderPricing();
      case "Availability":
        return renderAvailability();
      case "Review":
        return renderReview();
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => (stepIndex === 0 ? navigation.goBack() : back())}
        >
          <Ionicons name="arrow-back" size={24} color={colors.gray[50]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create a listing</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.progressBarWrapper}>
        <View
          style={[styles.progressBarFill, { width: `${progress * 100}%` }]}
        />
      </View>

      {currentStep === "Location" ? (
        <KeyboardAvoidingView
          style={styles.locationContainer}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Text style={styles.stepTitle}>{stepTitles[currentStep]}</Text>
          {body()}
        </KeyboardAvoidingView>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.stepTitle}>{stepTitles[currentStep]}</Text>
          {body()}
        </ScrollView>
      )}

      <View style={styles.bottomBar}>
        {stepIndex > 0 ? (
          <TouchableOpacity style={styles.secondaryBtn} onPress={back}>
            <Text style={styles.secondaryText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        {currentStep === "Review" ? (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => submit()}
            disabled={isPending}
          >
            <Ionicons
              name={isPending ? "sync" : "checkmark-circle"}
              size={20}
              color={colors.gray[900]}
            />
            <Text style={styles.primaryText}>
              {isPending ? "Publishing..." : "Publish"}
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            {currentStep === "Availability" && (
              <TouchableOpacity
                style={[styles.secondaryBtn, { marginLeft: spacing.sm }]}
                onPress={next}
              >
                <Text style={styles.secondaryText}>Skip Calendar</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.primaryBtn} onPress={next}>
              <Text style={styles.primaryText}>Next</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[900] },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[800],
  },
  backButton: { padding: spacing.xs },
  headerTitle: {
    flex: 1,
    fontSize: typography.sizes.lg,
    fontWeight: "600",
    color: colors.gray[50],
    textAlign: "center",
  },
  headerSpacer: { width: 32 },
  progressBarWrapper: { height: 4, backgroundColor: colors.gray[800] },
  progressBarFill: { height: 4, backgroundColor: colors.primary[500] },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: 120 },
  locationContainer: { flex: 1, padding: spacing.lg, paddingBottom: 120 },
  stepTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: "600",
    color: colors.gray[50],
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.gray[900],
    borderWidth: 1,
    borderColor: colors.gray[800],
    borderRadius: radius.md,
    padding: spacing.md,
  },
  cardTitle: {
    color: colors.gray[200],
    fontSize: typography.sizes.sm,
    marginBottom: spacing.sm,
  },
  sectionDescription: {
    fontSize: typography.sizes.sm,
    color: colors.gray[400],
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  label: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.gray[50],
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.gray[850],
    borderWidth: 1,
    borderColor: colors.gray[700],
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.gray[50],
    marginBottom: spacing.lg,
  },
  helper: { color: colors.gray[400], fontSize: typography.sizes.sm },
  reviewItem: { color: colors.gray[200], marginBottom: spacing.sm },
  reviewKey: { color: colors.gray[400] },
  bottomBar: {
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
    flexDirection: "row",
    gap: spacing.md,
  },
  calHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  calTitle: {
    color: colors.gray[50],
    fontSize: typography.sizes.md,
    fontWeight: "600",
  },
  weekRow: { flexDirection: "row", marginBottom: spacing.sm },
  weekday: {
    flex: 1,
    textAlign: "center",
    color: colors.gray[400],
    fontSize: typography.sizes.xs,
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cellPad: { width: `${100 / 7}%`, height: 64 },
  cell: {
    width: `${100 / 7}%`,
    height: 64,
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.gray[800],
  },
  cellDay: { color: colors.gray[300], fontSize: typography.sizes.xs },
  cellVal: { color: colors.primary[500], fontWeight: "700", marginTop: 2 },
  cellBtns: { flexDirection: "row", gap: 6, marginTop: 2 },
  photosRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  photoItem: {
    width: 96,
    height: 96,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.gray[800],
    alignItems: "center",
    justifyContent: "center",
  },
  photo: { width: "100%", height: "100%" },
  addPhoto: { borderWidth: 1, borderColor: colors.gray[700] },
  removeBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: colors.primary[500],
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gray[700],
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
  },
  secondaryText: {
    color: colors.gray[300],
    fontSize: typography.sizes.md,
    fontWeight: "600",
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: colors.primary[500],
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    flexDirection: "row",
    gap: spacing.sm,
  },
  primaryText: {
    color: colors.gray[900],
    fontSize: typography.sizes.md,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: "600",
    color: colors.gray[50],
    marginBottom: spacing.sm,
  },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.gray[700],
    backgroundColor: colors.gray[850],
  },
  chipSelected: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  chipText: {
    fontSize: typography.sizes.sm,
    color: colors.gray[300],
  },
  chipTextSelected: {
    color: colors.gray[900],
    fontWeight: "600",
  },
  documentItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.gray[800],
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  documentName: {
    color: colors.gray[50],
    fontSize: typography.sizes.md,
  },
  removeButton: {
    padding: spacing.xs,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  addButtonDisabled: {
    backgroundColor: colors.gray[800],
    opacity: 0.5,
  },
  addButtonText: {
    color: colors.gray[900],
    fontSize: typography.sizes.sm,
    fontWeight: "600",
  },
  addButtonTextDisabled: {
    color: colors.gray[600],
  },
});
