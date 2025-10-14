import React, { useState } from "react";
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
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography, radius } from "../../theme/tokens";
import { RootStackNavigationProp } from "../../navigation/types";
import { useToast } from "../../components/ui/Toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createListing, getCurrentProviderId } from "../../services/listing.service";
import { useRequireProvider } from "../../hooks/useRequireProvider";

export default function AddListing() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  useRequireProvider();

  // Form state - these hold the values the user types
  const [propertyName, setPropertyName] = useState("");
  const [address, setAddress] = useState("");
  const [totalBeds, setTotalBeds] = useState("");
  const [availableBeds, setAvailableBeds] = useState("");
  const [price, setPrice] = useState("");

  const { mutate: saveListing, isPending } = useMutation({
    mutationFn: async () => {
      const providerId = await getCurrentProviderId();
      if (!providerId) throw new Error("You must be logged in as a provider");
      const totalBedsNum = Number(totalBeds);
      const availableBedsNum = availableBeds ? Number(availableBeds) : undefined;
      const priceNum = price ? Number(price) : undefined;

      return createListing(providerId, {
        title: propertyName.trim(),
        address: address.trim(),
        totalBeds: totalBedsNum,
        availableBeds: availableBedsNum,
        price: priceNum,
      });
    },
    onSuccess: async (res) => {
      if (!res.success) {
        showToast(res.error || "Failed to create listing", "error");
        return;
      }
      showToast("Listing created", "success");
      await queryClient.invalidateQueries({ queryKey: ["providerListings"] });
      navigation.goBack();
    },
    onError: (err: any) => {
      showToast(err?.message || "Failed to create listing", "error");
    },
  });

  // Handle save button press
  const handleSave = () => {
    // Basic validation - make sure required fields are filled
    if (!propertyName || !address || !totalBeds) {
      Alert.alert("Missing Information", "Please fill in all required fields");
      return;
    }

    saveListing();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={colors.gray[50]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Listing</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Info banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={20} color={colors.primary[500]} />
          <Text style={styles.infoBannerText}>
            This is a simplified form. The full 11-step wizard will be built later!
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
        </View>

        {/* Price per Month */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Price per Month ($)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 500 (leave empty if free)"
            placeholderTextColor={colors.gray[500]}
            value={price}
            onChangeText={setPrice}
            keyboardType="number-pad"
            accessibilityLabel="Price input"
          />
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
          accessibilityLabel="Save listing"
          accessibilityRole="button"
          disabled={isPending}
        >
          <Ionicons name={isPending ? "sync" : "checkmark-circle"} size={20} color={colors.gray[900]} />
          <Text style={styles.saveButtonText}>{isPending ? "Saving..." : "Save Listing"}</Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 120, // Space for sticky bottom bar
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
