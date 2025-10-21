import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography } from "../../theme/tokens";
import { supabase } from "../../lib/supabase";

export default function AdminPanelScreen() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<"add-listing" | "manage">(
    "add-listing",
  );
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Form state for adding listings
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [phone, setPhone] = useState("");
  const [housingType, setHousingType] = useState("emergency_shelter");
  const [bedsAvailable, setBedsAvailable] = useState("");
  const [totalBeds, setTotalBeds] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Check admin access on mount
  React.useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          Alert.alert("Access Denied", "You must be logged in");
          navigation.goBack();
          return;
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (error || profile?.role !== "admin") {
          Alert.alert(
            "Access Denied",
            "You must be an admin to access this screen",
          );
          navigation.goBack();
          return;
        }

        setIsCheckingAuth(false);
      } catch (error) {
        console.error("Auth check error:", error);
        Alert.alert("Error", "Failed to verify access");
        navigation.goBack();
      }
    };

    checkAdminAccess();
  }, [navigation]);

  const handleAddListing = async () => {
    // Validate form
    if (!title || !description || !address || !city || !state || !zipCode) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert("Error", "You must be logged in");
        return;
      }

      // Geocode address (simplified - you'd use a real geocoding service)
      const lat = 34.0522 + (Math.random() - 0.5) * 0.1; // LA coordinates + random offset
      const lng = -118.2437 + (Math.random() - 0.5) * 0.1;

      const { data, error } = await supabase.from("listings").insert({
        provider_id: user.id,
        title,
        description,
        address,
        city,
        state,
        zip_code: zipCode,
        lat,
        lng,
        housing_type: housingType,
        unit_beds: {
          total: parseInt(totalBeds) || 0,
          available: parseInt(bedsAvailable) || 0,
        },
        contact: phone ? { phone } : {},
        is_active: true,
        verified: false,
      });

      if (error) {
        throw error;
      }

      Alert.alert(
        "Success!",
        "Listing created successfully. It will be reviewed by our team.",
        [{ text: "OK", onPress: () => resetForm() }],
      );
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create listing");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setAddress("");
    setCity("");
    setState("");
    setZipCode("");
    setPhone("");
    setBedsAvailable("");
    setTotalBeds("");
  };

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ color: colors.gray[400] }}>Verifying access...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <Text style={styles.headerSubtitle}>Add real shelter listings</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "add-listing" && styles.tabActive]}
          onPress={() => setActiveTab("add-listing")}
        >
          <Ionicons
            name="add-circle-outline"
            size={20}
            color={
              activeTab === "add-listing"
                ? colors.primary[400]
                : colors.gray[400]
            }
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "add-listing" && styles.tabTextActive,
            ]}
          >
            Add Listing
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "manage" && styles.tabActive]}
          onPress={() => setActiveTab("manage")}
        >
          <Ionicons
            name="list-outline"
            size={20}
            color={
              activeTab === "manage" ? colors.primary[400] : colors.gray[400]
            }
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "manage" && styles.tabTextActive,
            ]}
          >
            Manage
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === "add-listing" ? (
          <View style={styles.form}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            <Text style={styles.label}>Shelter Name *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Haven Emergency Shelter"
              placeholderTextColor={colors.gray[500]}
            />

            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the shelter, services provided, etc."
              placeholderTextColor={colors.gray[500]}
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>Housing Type *</Text>
            <View style={styles.pickerContainer}>
              <TouchableOpacity
                style={styles.picker}
                onPress={() => {
                  // In real app, show picker modal
                  Alert.alert("Select Type", "Emergency Shelter selected");
                }}
              >
                <Text style={styles.pickerText}>
                  {housingType.replace(/_/g, " ").toUpperCase()}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={colors.gray[400]}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Location</Text>

            <Text style={styles.label}>Street Address *</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="e.g., 123 Main St"
              placeholderTextColor={colors.gray[500]}
            />

            <View style={styles.row}>
              <View style={styles.flex1}>
                <Text style={styles.label}>City *</Text>
                <TextInput
                  style={styles.input}
                  value={city}
                  onChangeText={setCity}
                  placeholder="Los Angeles"
                  placeholderTextColor={colors.gray[500]}
                />
              </View>

              <View style={styles.stateInput}>
                <Text style={styles.label}>State *</Text>
                <TextInput
                  style={styles.input}
                  value={state}
                  onChangeText={setState}
                  placeholder="CA"
                  placeholderTextColor={colors.gray[500]}
                  maxLength={2}
                />
              </View>

              <View style={styles.zipInput}>
                <Text style={styles.label}>ZIP *</Text>
                <TextInput
                  style={styles.input}
                  value={zipCode}
                  onChangeText={setZipCode}
                  placeholder="90001"
                  placeholderTextColor={colors.gray[500]}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>
            </View>

            <Text style={styles.sectionTitle}>Availability</Text>

            <View style={styles.row}>
              <View style={styles.flex1}>
                <Text style={styles.label}>Beds Available</Text>
                <TextInput
                  style={styles.input}
                  value={bedsAvailable}
                  onChangeText={setBedsAvailable}
                  placeholder="0"
                  placeholderTextColor={colors.gray[500]}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.flex1}>
                <Text style={styles.label}>Total Beds</Text>
                <TextInput
                  style={styles.input}
                  value={totalBeds}
                  onChangeText={setTotalBeds}
                  placeholder="50"
                  placeholderTextColor={colors.gray[500]}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Text style={styles.sectionTitle}>Contact</Text>

            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="(555) 123-4567"
              placeholderTextColor={colors.gray[500]}
              keyboardType="phone-pad"
            />

            <TouchableOpacity
              style={[
                styles.submitButton,
                submitting && styles.submitButtonDisabled,
              ]}
              onPress={handleAddListing}
              disabled={submitting}
            >
              <Text style={styles.submitButtonText}>
                {submitting ? "Creating..." : "Create Listing"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.manageSection}>
            <Text style={styles.placeholderText}>
              Manage listings feature coming soon
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[900],
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[800],
  },
  headerTitle: {
    fontSize: typography.sizes["2xl"],
    fontWeight: typography.weights.bold,
    color: colors.gray[50],
  },
  headerSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.gray[400],
    marginTop: spacing.xs,
  },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[800],
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary[400],
  },
  tabText: {
    fontSize: typography.sizes.sm,
    color: colors.gray[400],
  },
  tabTextActive: {
    color: colors.primary[400],
    fontWeight: typography.weights.semibold,
  },
  content: {
    flex: 1,
  },
  form: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.gray[50],
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.sizes.sm,
    color: colors.gray[300],
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.gray[800],
    borderWidth: 1,
    borderColor: colors.gray[700],
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.md,
    color: colors.gray[50],
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  pickerContainer: {
    marginTop: spacing.xs,
  },
  picker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.gray[800],
    borderWidth: 1,
    borderColor: colors.gray[700],
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pickerText: {
    fontSize: typography.sizes.md,
    color: colors.gray[50],
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  flex1: {
    flex: 1,
  },
  stateInput: {
    width: 80,
  },
  zipInput: {
    width: 100,
  },
  submitButton: {
    backgroundColor: colors.primary[500],
    borderRadius: 8,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.gray[900],
  },
  manageSection: {
    padding: spacing.xl,
    alignItems: "center",
  },
  placeholderText: {
    fontSize: typography.sizes.md,
    color: colors.gray[500],
  },
});
