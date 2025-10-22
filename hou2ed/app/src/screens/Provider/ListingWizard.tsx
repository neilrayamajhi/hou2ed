import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, TextInput, Alert, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { colors, spacing, typography, radius } from "../../theme/tokens";
import { RootStackNavigationProp } from "../../navigation/types";
import { useToast } from "../../components/ui/Toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createListing, getCurrentProviderId } from "../../services/listing.service";
import * as ImagePicker from "expo-image-picker";
import { uploadListingImage } from "../../services/storage.service";
import { useRequireProvider } from "../../hooks/useRequireProvider";

type StepKey = "Basics" | "Location" | "Photos" | "AmenitiesRules" | "Pricing" | "Availability" | "Review";

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
  const [stepIndex, setStepIndex] = useState(0);

  // Form state (MVP subset)
  const [title, setTitle] = useState("");
  const [address, setAddress] = useState("");
  const [totalBeds, setTotalBeds] = useState("");
  const [availableBeds, setAvailableBeds] = useState("");
  const [price, setPrice] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [availabilityDays, setAvailabilityDays] = useState<Record<string, number>>({});

  const { mutate: submit, isPending } = useMutation({
    mutationFn: async () => {
      const providerId = await getCurrentProviderId();
      if (!providerId) throw new Error("You must be logged in as a provider");
      const totalBedsNum = Number(totalBeds);
      const availableBedsNum = availableBeds ? Number(availableBeds) : undefined;
      const priceNum = price ? Number(price) : undefined;
      const created = await createListing(providerId, {
        title: title.trim(),
        address: address.trim(),
        totalBeds: totalBedsNum,
        availableBeds: availableBedsNum,
        price: priceNum,
      });
      // If photos selected and created successfully, upload and attach
      if (created.success && created.listingId) {
        // Upload photos if any
        if (photos.length > 0) {
          const urls: string[] = [];
          for (const uri of photos) {
            const res = await uploadListingImage(uri, created.listingId, { resize: 'full' });
            if (res.success && res.url) urls.push(res.url);
          }
          if (urls.length > 0) {
            const { updateListing } = await import("../../services/listing.service");
            await updateListing(created.listingId, { images: urls });
          }
        }
        // Persist per-day availability (calendar) if provided
        if (Object.keys(availabilityDays).length > 0) {
          const { updateListing } = await import("../../services/listing.service");
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
      showToast("Listing published", "success");
      await queryClient.invalidateQueries({ queryKey: ["providerListings"] });
      navigation.navigate("ProviderDashboard");
    },
    onError: (e: any) => showToast(e?.message || "Failed to create listing", "error"),
  });

  const currentStep = steps[stepIndex];
  const progress = useMemo(() => (stepIndex + 1) / steps.length, [stepIndex, steps.length]);

  const next = () => {
    if (currentStep === "Basics") {
      if (!title.trim() || !address.trim() || !totalBeds) {
        Alert.alert("Missing info", "Title, address and total beds are required");
        return;
      }
    }
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  };
  const back = () => setStepIndex((i) => Math.max(i - 1, 0));

  const renderBasics = () => (
    <View>
      <Text style={styles.label}>Property name *</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Haven House" placeholderTextColor={colors.gray[500]} />

      <Text style={styles.label}>Address *</Text>
      <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="e.g. 123 Main St, City" placeholderTextColor={colors.gray[500]} />

      <Text style={styles.label}>Total beds *</Text>
      <TextInput style={styles.input} value={totalBeds} onChangeText={setTotalBeds} keyboardType="number-pad" placeholder="e.g. 12" placeholderTextColor={colors.gray[500]} />

      <Text style={styles.label}>Available beds (today)</Text>
      <TextInput style={styles.input} value={availableBeds} onChangeText={setAvailableBeds} keyboardType="number-pad" placeholder="e.g. 3" placeholderTextColor={colors.gray[500]} />
    </View>
  );

  const renderLocation = () => (
    <View>
      <Text style={styles.helper}>We’ll geocode address server-side later.</Text>
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
            const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (perm.status !== 'granted') {
              Alert.alert('Permission needed', 'Please allow photo library access');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: false, quality: 0.9 });
            if (!result.canceled) {
              const uri = result.assets?.[0]?.uri;
              if (uri) setPhotos((prev) => [...prev, uri]);
            }
          }}
          accessibilityLabel="Add photo"
        >
          <Ionicons name="add" size={24} color={colors.gray[500]} />
          <Text style={{ color: colors.gray[400], marginTop: 4 }}>Add photo</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.helper, { marginTop: spacing.sm }]}>Add a few photos to make your listing stand out.</Text>
    </View>
  );
  const renderAmenities = () => (
    <View>
      <Text style={styles.helper}>Amenities/Rules form coming next.</Text>
    </View>
  );
  const renderPricing = () => (
    <View>
      <Text style={styles.label}>Price per month ($)</Text>
      <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="number-pad" placeholder="e.g. 500 (leave empty if free)" placeholderTextColor={colors.gray[500]} />
    </View>
  );
  // Helpers for calendar
  const pad = (n: number) => String(n).padStart(2, '0');
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth()); // 0-11
  const firstOfMonth = new Date(calYear, calMonth, 1);
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const startWeekday = firstOfMonth.getDay(); // 0 Sun - 6 Sat
  const weeks: (number | null)[] = Array.from({ length: startWeekday }, () => null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
  );
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
      <View style={styles.calHeader}>
        <TouchableOpacity onPress={() => {
          let m = calMonth - 1; let y = calYear;
          if (m < 0) { m = 11; y -= 1; }
          setCalMonth(m); setCalYear(y);
        }} accessibilityLabel="Previous month">
          <Ionicons name="chevron-back" size={20} color={colors.gray[200]} />
        </TouchableOpacity>
        <Text style={styles.calTitle}>{new Date(calYear, calMonth).toLocaleString(undefined, { month: 'long', year: 'numeric' })}</Text>
        <TouchableOpacity onPress={() => {
          let m = calMonth + 1; let y = calYear;
          if (m > 11) { m = 0; y += 1; }
          setCalMonth(m); setCalYear(y);
        }} accessibilityLabel="Next month">
          <Ionicons name="chevron-forward" size={20} color={colors.gray[200]} />
        </TouchableOpacity>
      </View>
      <View style={styles.weekRow}>
        {['S','M','T','W','T','F','S'].map((d) => (
          <Text key={d} style={styles.weekday}>{d}</Text>
        ))}
      </View>
      <View style={styles.grid}>
        {weeks.map((day, idx) => {
          if (day === null) return <View key={`pad-${idx}`} style={styles.cellPad} />;
          const key = `${calYear}-${pad(calMonth + 1)}-${pad(day)}`;
          const val = availabilityDays[key] ?? 0;
          const max = Number(totalBeds) || 0;
          return (
            <View key={key} style={styles.cell}>
              <Text style={styles.cellDay}>{day}</Text>
              <Text style={styles.cellVal}>{val}</Text>
              <View style={styles.cellBtns}>
                <TouchableOpacity accessibilityLabel="Decrement value" onPress={() => changeDay(day, -1)} disabled={val <= 0}>
                  <Ionicons name="remove-circle" size={18} color={val > 0 ? colors.primary[500] : colors.gray[700]} />
                </TouchableOpacity>
                <TouchableOpacity accessibilityLabel="Increment value" onPress={() => changeDay(day, +1)} disabled={val >= max}>
                  <Ionicons name="add-circle" size={18} color={val < max ? colors.primary[500] : colors.gray[700]} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>
      <Text style={[styles.helper, { marginTop: spacing.sm }]}>Set per-day available beds. Max equals Total beds.</Text>
    </View>
  );
  const renderReview = () => (
    <View>
      <Text style={styles.reviewItem}><Text style={styles.reviewKey}>Name:</Text> {title || "-"}</Text>
      <Text style={styles.reviewItem}><Text style={styles.reviewKey}>Address:</Text> {address || "-"}</Text>
      <Text style={styles.reviewItem}><Text style={styles.reviewKey}>Total beds:</Text> {totalBeds || "-"}</Text>
      <Text style={styles.reviewItem}><Text style={styles.reviewKey}>Available today:</Text> {availableBeds || "-"}</Text>
      <Text style={styles.reviewItem}><Text style={styles.reviewKey}>Price:</Text> {price || "Free"}</Text>
    </View>
  );

  const body = () => {
    switch (currentStep) {
      case "Basics":
        return renderBasics();
      case "Location":
        return renderLocation();
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
        <TouchableOpacity style={styles.backButton} onPress={() => (stepIndex === 0 ? navigation.goBack() : back())}>
          <Ionicons name="arrow-back" size={24} color={colors.gray[50]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create a listing</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.progressBarWrapper}>
        <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.stepTitle}>{currentStep}</Text>
        {body()}
      </ScrollView>

      <View style={styles.bottomBar}>
        {stepIndex > 0 ? (
          <TouchableOpacity style={styles.secondaryBtn} onPress={back}>
            <Text style={styles.secondaryText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        {currentStep === "Review" ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={() => submit()} disabled={isPending}>
            <Ionicons name={isPending ? "sync" : "checkmark-circle"} size={20} color={colors.gray[900]} />
            <Text style={styles.primaryText}>{isPending ? "Publishing..." : "Publish"}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.primaryBtn} onPress={next}>
            <Text style={styles.primaryText}>Next</Text>
          </TouchableOpacity>
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
  headerTitle: { flex: 1, fontSize: typography.sizes.lg, fontWeight: "600", color: colors.gray[50], textAlign: "center" },
  headerSpacer: { width: 32 },
  progressBarWrapper: { height: 4, backgroundColor: colors.gray[800] },
  progressBarFill: { height: 4, backgroundColor: colors.primary[500] },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: 120 },
  stepTitle: { fontSize: typography.sizes.xl, fontWeight: "600", color: colors.gray[50], marginBottom: spacing.lg },
  label: { fontSize: typography.sizes.md, fontWeight: "600", color: colors.gray[50], marginBottom: spacing.sm },
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
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  calTitle: { color: colors.gray[50], fontSize: typography.sizes.md, fontWeight: '600' },
  weekRow: { flexDirection: 'row', marginBottom: spacing.sm },
  weekday: { flex: 1, textAlign: 'center', color: colors.gray[400], fontSize: typography.sizes.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cellPad: { width: `${100/7}%`, height: 64 },
  cell: { width: `${100/7}%`, height: 64, padding: 4, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.gray[800] },
  cellDay: { color: colors.gray[300], fontSize: typography.sizes.xs },
  cellVal: { color: colors.primary[500], fontWeight: '700', marginTop: 2 },
  cellBtns: { flexDirection: 'row', gap: 6, marginTop: 2 },
  photosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  photoItem: { width: 96, height: 96, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.gray[800], alignItems: 'center', justifyContent: 'center' },
  photo: { width: '100%', height: '100%' },
  addPhoto: { borderWidth: 1, borderColor: colors.gray[700] },
  removeBadge: { position: 'absolute', top: 4, right: 4, backgroundColor: colors.primary[500], borderRadius: radius.full, paddingHorizontal: 6, paddingVertical: 2 },
  secondaryBtn: { flex: 1, borderWidth: 1, borderColor: colors.gray[700], borderRadius: radius.md, alignItems: "center", justifyContent: "center", paddingVertical: spacing.md },
  secondaryText: { color: colors.gray[300], fontSize: typography.sizes.md, fontWeight: "600" },
  primaryBtn: { flex: 1, backgroundColor: colors.primary[500], borderRadius: radius.md, alignItems: "center", justifyContent: "center", paddingVertical: spacing.md, flexDirection: "row", gap: spacing.sm },
  primaryText: { color: colors.gray[900], fontSize: typography.sizes.md, fontWeight: "600" },
});
