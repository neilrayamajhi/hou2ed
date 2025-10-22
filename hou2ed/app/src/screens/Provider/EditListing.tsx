import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography, radius } from "../../theme/tokens";
import type { RootStackNavigationProp, RootStackRouteProp } from "../../navigation/types";
import { useToast } from "../../components/ui/Toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateListing, deleteListing, getListingById } from "../../services/listing.service";
import { useRequireProvider } from "../../hooks/useRequireProvider";
import * as ImagePicker from "expo-image-picker";
import { uploadListingImage } from "../../services/storage.service";

export default function EditListing() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<RootStackRouteProp<"EditListing">>();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  useRequireProvider();

  // Get the listing data passed from the previous screen
  const listingData = route.params?.listingData;

  // Form state - pre-filled with existing data
  const [propertyName, setPropertyName] = useState(listingData?.title || "");
  const [address, setAddress] = useState(listingData?.address || "");
  const [totalBeds, setTotalBeds] = useState(listingData?.totalBeds?.toString() || "");
  const [availableBeds, setAvailableBeds] = useState(listingData?.availableBeds?.toString() || "");
  const [images, setImages] = useState<string[]>([]);
  const [pendingLocal, setPendingLocal] = useState<string[]>([]);
  const [availabilityDays, setAvailabilityDays] = useState<Record<string, number>>({});

  const isRemote = (uri: string) => uri.startsWith("http://") || uri.startsWith("https://");

  useEffect(() => {
    (async () => {
      try {
        if (route.params?.listingId) {
          const full = await getListingById(route.params.listingId);
          if (full.images && Array.isArray(full.images)) {
            setImages(full.images);
          }
          if (full.availabilityDays) {
            setAvailabilityDays(full.availabilityDays);
          }
        }
      } catch (e) {
        // ignore
      }
    })();
  }, [route.params?.listingId]);

  const { mutate: saveChanges, isPending: isSaving } = useMutation({
    mutationFn: async () => {
      if (!route.params?.listingId) throw new Error("Missing listing ID");
      let updates: any = {};
      if (propertyName.trim()) updates.title = propertyName.trim();
      if (address.trim()) updates.address = address.trim();
      if (totalBeds !== "") updates.totalBeds = Number(totalBeds);
      if (availableBeds !== "") updates.availableBeds = Number(availableBeds);

      // Handle photo uploads (replace local URIs with uploaded URLs, keep order and deletions)
      let finalImages = [...images];
      const locals = finalImages.filter((u) => !isRemote(u));
      if (locals.length > 0) {
        const uploaded: string[] = [];
        for (const localUri of locals) {
          const res = await uploadListingImage(localUri, route.params.listingId!, { resize: 'full' });
          if (res.success && res.url) uploaded.push(res.url);
        }
        // Replace local placeholders with uploaded URLs in order
        let idx = 0;
        finalImages = finalImages.map((u) => (isRemote(u) ? u : uploaded[idx++] || u));
      }
      updates.images = finalImages;
      if (Object.keys(availabilityDays).length > 0) {
        updates.availabilityDays = availabilityDays;
      }

      return updateListing(route.params.listingId, updates);
    },
    onSuccess: async (res) => {
      if (!res.success) {
        showToast(res.error || "Failed to update listing", "error");
        return;
      }
      showToast("Listing updated", "success");
      await queryClient.invalidateQueries({ queryKey: ["providerListings"] });
      navigation.goBack();
    },
    onError: (err: any) => {
      showToast(err?.message || "Failed to update listing", "error");
    },
  });

  const { mutate: destroyListing, isPending: isDeleting } = useMutation({
    mutationFn: async () => {
      if (!route.params?.listingId) throw new Error("Missing listing ID");
      return deleteListing(route.params.listingId);
    },
    onSuccess: async (res) => {
      if (!res.success) {
        showToast(res.error || "Failed to delete listing", "error");
        return;
      }
      showToast("Listing deleted", "success");
      await queryClient.invalidateQueries({ queryKey: ["providerListings"] });
      navigation.goBack();
    },
    onError: (err: any) => {
      showToast(err?.message || "Failed to delete listing", "error");
    },
  });

  // Handle save button press
  const handleSave = () => {
    // Basic validation
    if (!propertyName || !address || !totalBeds) {
      Alert.alert("Missing Information", "Please fill in all required fields");
      return;
    }

    saveChanges();
  };

  // Handle delete button press
  const handleDelete = () => {
    Alert.alert(
      "Delete Listing",
      `Are you sure you want to delete "${propertyName}"? This cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => destroyListing(),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={colors.gray[50]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Listing</Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          accessibilityLabel="Delete listing"
          accessibilityRole="button"
        >
          <Ionicons name="trash-outline" size={24} color={colors.red} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Info banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="create-outline" size={20} color={colors.primary[500]} />
          <Text style={styles.infoBannerText}>
            Editing: {listingData?.title || "Unknown Listing"}
          </Text>
        </View>

        {/* Property Name */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Property Name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Haven House"
            placeholderTextColor={colors.gray[500]}
            value={propertyName}
            onChangeText={setPropertyName}
            accessibilityLabel="Property name input"
          />
        </View>

        {/* Address */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Address <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 123 Main St, San Francisco, CA"
            placeholderTextColor={colors.gray[500]}
            value={address}
            onChangeText={setAddress}
            accessibilityLabel="Address input"
          />
        </View>

        {/* Total Beds */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Total Beds <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 12"
            placeholderTextColor={colors.gray[500]}
            value={totalBeds}
            onChangeText={setTotalBeds}
            keyboardType="number-pad"
            accessibilityLabel="Total beds input"
          />
        </View>

        {/* Available Beds */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Available Beds</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 3"
            placeholderTextColor={colors.gray[500]}
            value={availableBeds}
            onChangeText={setAvailableBeds}
            keyboardType="number-pad"
            accessibilityLabel="Available beds input"
          />
          <Text style={styles.fieldHint}>
            Use "Update Availability" for daily bed count updates
          </Text>
        </View>

        {/* Photos Manager */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Photos</Text>
          <View style={styles.photosRow}>
            {images.map((uri) => (
              <View key={uri} style={styles.photoItem}>
                <Image source={{ uri: isRemote(uri) ? uri : uri }} style={styles.photo} />
                <TouchableOpacity
                  style={styles.removeBadge}
                  onPress={() => setImages((prev) => prev.filter((u) => u !== uri))}
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
                  if (uri) {
                    setImages((prev) => [...prev, uri]);
                    setPendingLocal((prev) => [...prev, uri]);
                  }
                }
              }}
              accessibilityLabel="Add photo"
            >
              <Ionicons name="add" size={24} color={colors.gray[500]} />
              <Text style={{ color: colors.gray[400], marginTop: 4 }}>Add photo</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.fieldHint}>First photo is the cover. You can remove or add more.</Text>
        </View>

        {/* Calendar Availability Editor */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Availability (per day)</Text>
          <CalendarEditor
            totalBedsInput={totalBeds}
            availabilityDays={availabilityDays}
            onChange={setAvailabilityDays}
          />
          <Text style={styles.fieldHint}>Adjust per-day beds. Max equals Total Beds.</Text>
        </View>

        {/* Last Updated Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Last Updated</Text>
          <Text style={styles.infoValue}>{listingData?.lastUpdated || "Never"}</Text>
        </View>

        {/* Helper text */}
        <Text style={styles.helperText}>
          <Text style={styles.required}>*</Text> Required fields
        </Text>
      </ScrollView>

        {/* Sticky bottom buttons */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Cancel"
            accessibilityRole="button"
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            accessibilityLabel="Save changes"
            accessibilityRole="button"
            disabled={isSaving}
          >
            <Ionicons name={isSaving ? "sync" : "checkmark-circle"} size={20} color={colors.gray[900]} />
            <Text style={styles.saveButtonText}>{isSaving ? "Saving..." : "Save Changes"}</Text>
          </TouchableOpacity>
        </View>
    </SafeAreaView>
  );
}

// Inline CalendarEditor component (keeps file self-contained)
function CalendarEditor({ totalBedsInput, availabilityDays, onChange }: { totalBedsInput: string; availabilityDays: Record<string, number>; onChange: (d: Record<string, number>) => void }) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const firstOfMonth = new Date(calYear, calMonth, 1);
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const startWeekday = firstOfMonth.getDay();
  const weeks: (number | null)[] = Array.from({ length: startWeekday }, () => null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));
  while (weeks.length % 7 !== 0) weeks.push(null);

  const total = Number(totalBedsInput) || 0;
  const changeDay = (day: number, delta: number) => {
    const key = `${calYear}-${pad(calMonth + 1)}-${pad(day)}`;
    onChange({ ...availabilityDays, [key]: Math.max(0, Math.min(total, (availabilityDays[key] ?? 0) + delta)) });
  };

  return (
    <View>
      <View style={styles.calHeader}>
        <TouchableOpacity onPress={() => { let m = calMonth - 1, y = calYear; if (m < 0) { m = 11; y -= 1; } setCalMonth(m); setCalYear(y); }} accessibilityLabel="Previous month">
          <Ionicons name="chevron-back" size={20} color={colors.gray[200]} />
        </TouchableOpacity>
        <Text style={styles.calTitle}>{new Date(calYear, calMonth).toLocaleString(undefined, { month: 'long', year: 'numeric' })}</Text>
        <TouchableOpacity onPress={() => { let m = calMonth + 1, y = calYear; if (m > 11) { m = 0; y += 1; } setCalMonth(m); setCalYear(y); }} accessibilityLabel="Next month">
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
          return (
            <View key={key} style={styles.cell}>
              <Text style={styles.cellDay}>{day}</Text>
              <Text style={styles.cellVal}>{val}</Text>
              <View style={styles.cellBtns}>
                <TouchableOpacity accessibilityLabel="Decrement value" onPress={() => changeDay(day, -1)} disabled={val <= 0}>
                  <Ionicons name="remove-circle" size={18} color={val > 0 ? colors.primary[500] : colors.gray[700]} />
                </TouchableOpacity>
                <TouchableOpacity accessibilityLabel="Increment value" onPress={() => changeDay(day, +1)} disabled={val >= total}>
                  <Ionicons name="add-circle" size={18} color={val < total ? colors.primary[500] : colors.gray[700]} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>
    </View>
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
  deleteButton: {
    padding: spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 120,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.gray[850],
    borderLeftWidth: 3,
    borderLeftColor: colors.primary[500],
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  infoBannerText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.gray[300],
    lineHeight: 20,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.gray[50],
    marginBottom: spacing.sm,
  },
  required: {
    color: colors.red,
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
  },
  fieldHint: {
    fontSize: typography.sizes.xs,
    color: colors.gray[500],
    marginTop: spacing.xs,
  },
  photosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  photoItem: { width: 96, height: 96, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.gray[800], alignItems: 'center', justifyContent: 'center' },
  photo: { width: '100%', height: '100%' },
  addPhoto: { borderWidth: 1, borderColor: colors.gray[700] },
  removeBadge: { position: 'absolute', top: 4, right: 4, backgroundColor: colors.primary[500], borderRadius: radius.full, paddingHorizontal: 6, paddingVertical: 2 },
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
  infoCard: {
    backgroundColor: colors.gray[850],
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  infoLabel: {
    fontSize: typography.sizes.xs,
    color: colors.gray[400],
    marginBottom: spacing.xs,
  },
  infoValue: {
    fontSize: typography.sizes.md,
    color: colors.gray[50],
    fontWeight: "500",
  },
  helperText: {
    fontSize: typography.sizes.sm,
    color: colors.gray[500],
    marginTop: spacing.md,
  },
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
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray[700],
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.gray[300],
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.primary[500],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  saveButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.gray[900],
  },
});
