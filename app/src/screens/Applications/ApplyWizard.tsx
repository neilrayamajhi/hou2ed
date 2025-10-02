import React, { useState, useEffect } from "react";
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
import { DRAFT_STORAGE_KEY, TOTAL_STEPS, APPLICATION_STEPS } from "../../constants/application";
import Step1Info from "./Step1Info";
import Step2Eligibility from "./Step2Eligibility";
import Step3Documents from "./Step3Documents";
import Step4Review from "./Step4Review";

// Types for application data
export interface ApplicationDraft {
  listingId?: string;
  // Step 1
  fullName: string;
  phone: string;
  email: string;
  // Step 2
  eligibilityTags?: string[];
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

type ApplyWizardRouteProp = RouteProp<RootStackParamList, 'ApplyWizard'>;
type ApplyWizardNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ApplyWizard'>;

export default function ApplyWizard() {
  const navigation = useNavigation<ApplyWizardNavigationProp>();
  const route = useRoute<ApplyWizardRouteProp>();
  const listingId = route.params?.listingId;

  const [currentStep, setCurrentStep] = useState(1);
  const [draft, setDraft] = useState<ApplicationDraft>({
    listingId,
    fullName: "",
    phone: "",
    email: "",
  });

  // Load saved draft on mount
  useEffect(() => {
    loadDraft();
  }, []);

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

  const updateDraft = (updates: Partial<ApplicationDraft>) => {
    setDraft((prev) => ({ ...prev, ...updates }));
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      // Dismiss the modal when on the first step
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        // Fallback: navigate to home if can't go back
        navigation.navigate('Tabs' as any);
      }
    }
  };

  const handleClose = () => {
    // Always dismiss the modal when X button is pressed
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // Fallback: navigate to home if can't go back
      navigation.navigate('Tabs' as any);
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
    // TODO: Submit application to backend
    console.log("Submitting application:", draft);

    // Show success alert
    Alert.alert(
      "Application Submitted!",
      "Your application has been successfully submitted. You can track its status in the Applications section.",
      [
        {
          text: "View Status",
          onPress: async () => {
            await clearDraft();
            // TODO: Navigate to Applications list
            navigation.goBack();
          },
        },
      ],
      { cancelable: false }
    );
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
          <Step1Info
            draft={draft}
            onUpdate={updateDraft}
            onNext={handleNext}
          />
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
          {APPLICATION_STEPS[currentStep as keyof typeof APPLICATION_STEPS]?.title}
        </Text>
        <Text style={styles.stepSubtitle}>Step {currentStep} of {TOTAL_STEPS}</Text>
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