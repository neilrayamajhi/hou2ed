import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography, radius } from "../../theme/tokens";
import type { RootStackNavigationProp, RootStackRouteProp } from "../../navigation/types";
import { useToast } from "../../components/ui/Toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateListing, deleteListing } from "../../services/listing.service";

export default function EditListing() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<RootStackRouteProp<"EditListing">>();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Get the listing data passed from the previous screen
  const listingData = route.params?.listingData;

  // Form state - pre-filled with existing data
  const [propertyName, setPropertyName] = useState(listingData?.title || "");
  const [address, setAddress] = useState(listingData?.address || "");
  const [totalBeds, setTotalBeds] = useState(listingData?.totalBeds?.toString() || "");
  const [availableBeds, setAvailableBeds] = useState(listingData?.availableBeds?.toString() || "");

  const { mutate: saveChanges, isPending: isSaving } = useMutation({
    mutationFn: async () => {
      if (!route.params?.listingId) throw new Error("Missing listing ID");
      const updates: any = {};
      if (propertyName.trim()) updates.title = propertyName.trim();
      if (address.trim()) updates.address = address.trim();
      if (totalBeds !== "") updates.totalBeds = Number(totalBeds);
      if (availableBeds !== "") updates.availableBeds = Number(availableBeds);
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
