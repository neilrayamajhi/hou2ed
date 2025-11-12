import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Text,
  Alert,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { colors, spacing, radius } from "../../theme/tokens";
import { RootStackParamList } from "../../navigation/types";
import {
  DRAFT_STORAGE_KEY,
  TOTAL_STEPS,
  APPLICATION_STEPS,
} from "../../constants/application";
import Step1Info from "./Step1Info";
import Step2Eligibility from "./Step2Eligibility";
import Step3Documents from "./Step3Documents";
import Step4Review from "./Step4Review";
import { useAuthStore } from "../../state/useAuthStore";
import { supabase } from "../../lib/supabase";
import { getExistingApplication } from "../../services/application.service";

// Types for application data
export interface ApplicationDraft {
  listingId?: string;
  // Step 1
  fullName: string;
  phone: string;
  email: string;
  // Step 2
  eligibilityTags?: string[];
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  additionalInfo?: string;
  // Step 3
  documents?: Array<{
    type: string;
    uri: string;
    name: string;
    size: number;
  }>;
  // Step 4
  signature?: string;
  agreedToTerms?: boolean;
}

type ApplyWizardRouteProp = RouteProp<RootStackParamList, "ApplyWizard">;
type ApplyWizardNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "ApplyWizard"
>;

export default function ApplyWizard() {
  const navigation = useNavigation<ApplyWizardNavigationProp>();
  const route = useRoute<ApplyWizardRouteProp>();
  const listingId = route.params?.listingId;

  // Get auth state
  const { user } = useAuthStore();

  const [currentStep, setCurrentStep] = useState(1);
  const [draft, setDraft] = useState<ApplicationDraft>({
    listingId,
    fullName: "",
    phone: "",
    email: "",
  });

  // Load saved draft on mount and check for existing applications
  useEffect(() => {
    loadDraft();
    checkExistingApplication();
  }, []);

  // Check auth on mount
  useEffect(() => {
    if (!user) {
      console.warn("⚠️ ApplyWizard: No user found in auth store on mount");
    } else {
      console.log("✅ ApplyWizard: User found in auth store:", user.email);
    }
  }, [user]);

  // Save draft whenever it changes
  useEffect(() => {
    saveDraft();
  }, [draft]);

  const loadDraft = async () => {
    try {
      const savedDraft = await SecureStore.getItemAsync(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        // Only restore if same listing
        if (parsed.listingId === listingId) {
          setDraft(parsed);
        }
      }
    } catch (error) {
      console.error("Error loading draft:", error);
    }
  };

  const saveDraft = async () => {
    try {
      await SecureStore.setItemAsync(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch (error) {
      console.error("Error saving draft:", error);
    }
  };

  const clearDraft = async () => {
    try {
      await SecureStore.deleteItemAsync(DRAFT_STORAGE_KEY);
    } catch (error) {
      console.error("Error clearing draft:", error);
    }
  };

  const checkExistingApplication = async () => {
    if (!listingId) return;

    try {
      const result = await getExistingApplication(listingId);

      if (result.exists && !result.canResubmit) {
        // Show alert and navigate back
        Alert.alert(
          "Application Already Exists",
          result.message || "You have already applied to this listing.",
          [
            {
              text: "OK",
              onPress: () => {
                navigation.goBack();
              },
            },
          ],
          { cancelable: false }
        );
      } else if (result.exists && result.canResubmit) {
        // Inform user they can resubmit
        Alert.alert(
          "Resubmission Available",
          result.message || "You can now submit a new application for this listing.",
          [{ text: "Continue" }]
        );
      }
    } catch (error) {
      console.error("Error checking existing application:", error);
    }
  };

  const updateDraft = useCallback((updates: Partial<ApplicationDraft>) => {
    setDraft((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      // Dismiss the modal when on the first step
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        // Fallback: navigate to home if can't go back
        navigation.navigate("Tabs" as any);
      }
    }
  };

  const handleClose = () => {
    // Always dismiss the modal when X button is pressed
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // Fallback: navigate to home if can't go back
      navigation.navigate("Tabs" as any);
    }
  };

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleEditStep = (step: number) => {
    setCurrentStep(step);
  };

  const handleSubmit = async () => {
    try {
      // Check if user is authenticated
      console.log("🔵 Submitting application - checking auth");
      console.log("User from store:", user);

      if (!user || !user.id) {
        console.error("❌ No user found in auth store");
        Alert.alert("Error", "You must be logged in to submit an application");
        return;
      }

      console.log("✅ User authenticated, ID:", user.id);

      if (!draft.listingId) {
        Alert.alert("Error", "Invalid listing. Please try again.");
        return;
      }

      // Check for existing application before submitting
      const existingApp = await getExistingApplication(draft.listingId);

      if (existingApp.exists && !existingApp.canResubmit) {
        Alert.alert(
          "Cannot Submit",
          existingApp.message || "You already have an active application for this listing.",
          [{ text: "OK" }]
        );
        return;
      }

      // If there's an existing application that can be resubmitted (rejected/withdrawn),
      // we need to delete the old one first to avoid the unique constraint
      if (existingApp.exists && existingApp.canResubmit && existingApp.application) {
        console.log("🔄 Deleting old application before resubmission");
        const { error: deleteError } = await supabase
          .from("applications")
          .delete()
          .eq("id", existingApp.application.id);

        if (deleteError) {
          console.error("Error deleting old application:", deleteError);
          // Continue anyway - the insert might still work
        }
      }

      // Validate listing_id is a valid UUID format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(draft.listingId)) {
        console.warn("Warning: listing_id is not a UUID:", draft.listingId);
        console.warn("This may cause issues with database insertion");
        // Show warning but allow for testing
        Alert.alert(
          "Warning",
          `The listing ID "${draft.listingId}" is not in UUID format. This application may fail to submit.\n\nFor production, please use real listings with UUID IDs.`,
          [
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => {
                throw new Error("User cancelled due to invalid listing ID");
              },
            },
            { text: "Continue Anyway", style: "destructive" },
          ],
        );
      }

      // Parse eligibility tags to extract specific flags
      const eligibilityTags = draft.eligibilityTags || [];
      const veteranStatus = eligibilityTags.includes("veterans");
      const disabilityStatus = eligibilityTags.includes("disabilities");

      // First, let's check what columns exist by doing a test select
      console.log("Testing applications table structure...");
      const { data: testData, error: testError } = await supabase
        .from("applications")
        .select("*")
        .limit(1);

      if (testError) {
        console.error("Error checking table structure:", testError);
      } else {
        console.log(
          "Available columns:",
          testData && testData[0] ? Object.keys(testData[0]) : "No data",
        );
      }

      // Insert with all the form data
      const applicationData = {
        listing_id: draft.listingId,
        seeker_id: user.id,
        status: "new",
        application_data: {
          fullName: draft.fullName,
          phone: draft.phone,
          email: draft.email,
          eligibilityTags: draft.eligibilityTags,
          emergencyContact: draft.emergencyContact,
          additionalInfo: draft.additionalInfo,
          documents: draft.documents,
          signature: draft.signature,
          agreedToTerms: draft.agreedToTerms,
        },
        stage_timestamps: {
          new: new Date().toISOString(),
        },
      };

      console.log("Inserting application with data:", applicationData);

      // Insert application into database
      const { data, error } = await supabase
        .from("applications")
        .insert(applicationData)
        .select()
        .single();

      if (error) {
        console.error("Error submitting application:", error);
        Alert.alert(
          "Submission Failed",
          "Failed to submit your application. Please try again.",
        );
        return;
      }

      console.log("Application submitted successfully:", data);

      // Upload documents to the documents table if any
      if (draft.documents && draft.documents.length > 0 && data.id) {
        console.log("Saving documents to documents table...");

        for (const doc of draft.documents) {
          const { error: docError } = await supabase
            .from("documents")
            .insert({
              application_id: data.id,
              type: doc.type,
              file_url: doc.uri, // For now, storing the local URI
              file_name: doc.name,
              file_size: doc.size,
              status: "uploaded",
              uploaded_by: user.id,
            });

          if (docError) {
            console.error("Error saving document:", docError);
          } else {
            console.log("Document saved successfully:", doc.name);
          }
        }
      }

      // Clear draft after successful submission
      await clearDraft();

      // Show success alert
      Alert.alert(
        "Application Submitted!",
        "Your application has been successfully submitted. You can track its status in the Applications section.",
        [
          {
            text: "View Applications",
            onPress: () => {
              navigation.goBack();
              // Navigate to applications list after a short delay
              setTimeout(() => {
                navigation.navigate("ApplicationsList");
              }, 100);
            },
          },
          {
            text: "Done",
            onPress: () => {
              navigation.goBack();
            },
          },
        ],
        { cancelable: false },
      );
    } catch (error) {
      console.error("Unexpected error during submission:", error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
        <View key={step} style={styles.stepWrapper}>
          <View
            style={[
              styles.stepCircle,
              currentStep >= step && styles.stepCircleActive,
              currentStep === step && styles.stepCircleCurrent,
            ]}
          >
            <Text
              style={[
                styles.stepNumber,
                currentStep >= step && styles.stepNumberActive,
              ]}
            >
              {currentStep > step ? "✓" : step}
            </Text>
          </View>
          {step < TOTAL_STEPS && (
            <View
              style={[
                styles.stepLine,
                currentStep > step && styles.stepLineActive,
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1Info draft={draft} onUpdate={updateDraft} onNext={handleNext} />
        );
      case 2:
        return (
          <Step2Eligibility
            draft={draft}
            onUpdate={updateDraft}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 3:
        return (
          <Step3Documents
            draft={draft}
            onUpdate={updateDraft}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 4:
        return (
          <Step4Review
            draft={draft}
            onUpdate={updateDraft}
            onSubmit={handleSubmit}
            onBack={handleBack}
            onEditStep={handleEditStep}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Apply for Housing</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Step Title */}
      <View style={styles.stepTitleContainer}>
        <Text style={styles.stepTitle}>
          {
            APPLICATION_STEPS[currentStep as keyof typeof APPLICATION_STEPS]
              ?.title
          }
        </Text>
        <Text style={styles.stepSubtitle}>
          Step {currentStep} of {TOTAL_STEPS}
        </Text>
      </View>

      {/* Content */}
      {renderStepContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  backButton: {
    padding: spacing.xs,
  },
  closeButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.white,
  },
  stepIndicator: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  stepWrapper: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.darkGray,
    borderWidth: 2,
    borderColor: colors.borderGray,
    justifyContent: "center",
    alignItems: "center",
  },
  stepCircleActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  stepCircleCurrent: {
    borderColor: colors.gold,
    backgroundColor: colors.black,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.gray,
  },
  stepNumberActive: {
    color: colors.black,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.borderGray,
    marginHorizontal: spacing.xs,
  },
  stepLineActive: {
    backgroundColor: colors.gold,
  },
  stepTitleContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.gold,
    marginBottom: spacing.xs,
  },
  stepSubtitle: {
    fontSize: 14,
    color: colors.gray,
  },
  placeholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  placeholderText: {
    fontSize: 18,
    color: colors.white,
    marginBottom: spacing.xl,
  },
  nextButton: {
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.black,
  },
});
