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
import { uploadApplicationDocument } from "../../services/storage.service";

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
  ipAddress?: string;
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
  const [isSubmitting, setIsSubmitting] = useState(false); // Add loading state
  const [draft, setDraft] = useState<ApplicationDraft>({
    listingId,
    fullName: "",
    phone: "",
    email: "",
    // Clear any previous eligibility and documents
    eligibilityTags: [],
    documents: [],
    signature: "",
    agreedToTerms: false,
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

  // Use listing-specific draft key to prevent cross-contamination
  const getDraftKey = () => `${DRAFT_STORAGE_KEY}_${listingId || 'unknown'}`;

  const loadDraft = async () => {
    try {
      const draftKey = getDraftKey();
      const savedDraft = await SecureStore.getItemAsync(draftKey);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        // Only restore if same listing (double-check)
        if (parsed.listingId === listingId) {
          setDraft(parsed);
        } else {
          // Clear mismatched draft
          await SecureStore.deleteItemAsync(draftKey);
        }
      }
    } catch (error) {
      console.error("Error loading draft:", error);
    }
  };

  const saveDraft = async () => {
    try {
      const draftKey = getDraftKey();
      await SecureStore.setItemAsync(draftKey, JSON.stringify(draft));
    } catch (error) {
      console.error("Error saving draft:", error);
    }
  };

  const clearDraft = async () => {
    try {
      const draftKey = getDraftKey();
      await SecureStore.deleteItemAsync(draftKey);

      // Also try to clear the old non-listing-specific key for backwards compatibility
      try {
        await SecureStore.deleteItemAsync(DRAFT_STORAGE_KEY);
      } catch {
        // Ignore error if old key doesn't exist
      }
    } catch (error) {
      console.error("Error clearing draft:", error);
    }
  };

  // Clear all application drafts to prevent data leakage between applications
  const clearAllApplicationDrafts = async () => {
    try {
      // Get all keys from SecureStore
      // Since SecureStore doesn't provide a way to list all keys,
      // we'll just clear common patterns
      const prefixesToClear = [
        DRAFT_STORAGE_KEY, // Old format
        `${DRAFT_STORAGE_KEY}_`, // New format prefix
      ];

      // Try to clear any keys that might exist
      // This is a best-effort approach
      for (let i = 0; i < 10; i++) {
        try {
          // Clear potential drafts for recent listings
          await SecureStore.deleteItemAsync(`${DRAFT_STORAGE_KEY}_${i}`);
        } catch {
          // Ignore if doesn't exist
        }
      }

      console.log("Cleared all application drafts");
    } catch (error) {
      console.error("Error clearing all drafts:", error);
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
    // Prevent multiple submissions
    if (isSubmitting) {
      console.log("⚠️ Already submitting, ignoring duplicate click");
      return;
    }

    try {
      setIsSubmitting(true); // Start loading state

      // Check if user is authenticated
      console.log("🔵 Submitting application - checking auth");
      console.log("User from store:", user);

      if (!user || !user.id) {
        console.error("❌ No user found in auth store");
        Alert.alert("Error", "You must be logged in to submit an application");
        setIsSubmitting(false);
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
        console.log("🔄 Deleting old application before resubmission:", existingApp.application.id);
        const { error: deleteError } = await supabase
          .from("applications")
          .delete()
          .eq("id", existingApp.application.id)
          .eq("seeker_id", user.id); // Add extra safety check

        if (deleteError) {
          console.error("Error deleting old application:", deleteError);
          Alert.alert(
            "Cannot Resubmit",
            "Failed to delete the old application. Please try withdrawing or deleting it from My Applications first.",
            [{ text: "OK" }]
          );
          return; // Stop here if we can't delete the old application
        } else {
          console.log("✅ Successfully deleted old application");
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

      // Get listing to find provider and check for blocks
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .select('provider_id')
        .eq('id', draft.listingId)
        .single();

      if (listingError || !listing) {
        console.error('Error fetching listing:', listingError);
        Alert.alert('Error', 'Unable to find this listing');
        setSubmitting(false);
        return;
      }

      // Check if provider has blocked this seeker
      console.log('🔍 Checking if provider has blocked seeker...', {
        providerId: listing.provider_id,
        seekerId: user.id,
      });

      const { data: blockCheck } = await supabase
        .from('blocks')
        .select('id')
        .eq('blocker_id', listing.provider_id)
        .eq('blocked_id', user.id)
        .maybeSingle();

      console.log('🔍 Block check result:', blockCheck ? 'BLOCKED ❌' : 'NOT BLOCKED ✅');

      if (blockCheck) {
        console.log('🚫 Application blocked - provider has blocked this seeker');
        Alert.alert(
          'Cannot Apply',
          'You cannot apply to this listing',
          [{ text: 'OK' }]
        );
        setSubmitting(false);
        return;
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
          ipAddress: draft.ipAddress,
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

        // Check if it's a duplicate key error
        if (error.code === '23505' || error.message?.includes('duplicate key')) {
          Alert.alert(
            "Application Already Exists",
            "You have already applied to this listing. You cannot submit multiple applications to the same listing unless your previous application was rejected or withdrawn.",
            [
              {
                text: "View My Applications",
                onPress: () => {
                  navigation.goBack();
                  setTimeout(() => {
                    navigation.navigate("ApplicationsList");
                  }, 100);
                },
              },
              { text: "OK", style: "cancel" }
            ]
          );
        } else {
          Alert.alert(
            "Submission Failed",
            "Failed to submit your application. Please try again.",
          );
        }
        return;
      }

      console.log("Application submitted successfully:", data);

      // Upload documents to storage and save to documents table
      if (draft.documents && draft.documents.length > 0 && data.id) {
        console.log("Uploading documents to storage...");

        for (const doc of draft.documents) {
          try {
            let finalPath = null;
            let uploadStatus = "uploaded";

            // Check if document was already uploaded during Step3
            if (doc.storagePath && doc.uploaded) {
              console.log("Document already uploaded to storage:", doc.storagePath);
              finalPath = doc.storagePath;
            } else {
              // Document needs to be uploaded
              console.log("Uploading document to storage:", doc.name);
              console.log("Document URI:", doc.uri);
              console.log("Application ID:", data.id);
              console.log("Document Type:", doc.type);

              // Upload to Supabase Storage
              const uploadResult = await uploadApplicationDocument(
                doc.uri,
                data.id,
                doc.type
              );

              if (uploadResult.success && uploadResult.path) {
                console.log("✅ Document uploaded successfully to storage:", uploadResult.path);
                finalPath = uploadResult.path;
              } else {
                console.error("❌ Failed to upload document:", doc.name, uploadResult.error);
                uploadStatus = "upload_failed";

                // Continue to save the document record even if upload failed
                // This helps us track failed uploads
              }
            }

            // Save document info to database
            const { error: docError } = await supabase
              .from("documents")
              .insert({
                application_id: data.id,
                type: doc.type,
                file_path: finalPath, // Store the storage path
                file_url: null, // Don't store URLs anymore, we'll generate signed URLs when needed
                file_name: doc.name,
                file_size: doc.size,
                status: uploadStatus,
                uploaded_by: user.id,
              });

            if (docError) {
              console.error("Error saving document info:", docError);
            } else {
              console.log("Document info saved successfully:", doc.name);
            }
          } catch (error) {
            console.error("Error processing document:", error);
          }
        }
      }

      // Clear draft after successful submission
      await clearDraft();

      // Also clear any other old drafts to prevent data leakage
      // This helps ensure users always start fresh for new applications
      await clearAllApplicationDrafts();

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
    } finally {
      setIsSubmitting(false); // Always reset loading state
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
            isSubmitting={isSubmitting}
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
