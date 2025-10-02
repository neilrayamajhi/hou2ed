import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius } from "../../theme/tokens";
import {
  DOCUMENT_TYPES,
  ELIGIBILITY_TAG_GROUPS,
} from "../../constants/application";
import Checkbox from "../../components/ui/Checkbox";
import type { ApplicationDraft } from "./ApplyWizard";

interface Step4ReviewProps {
  draft: ApplicationDraft;
  onUpdate: (updates: Partial<ApplicationDraft>) => void;
  onSubmit: () => void;
  onBack: () => void;
  onEditStep: (step: number) => void;
}

interface ReviewSection {
  title: string;
  step: number;
  items: Array<{
    label: string;
    value: string | undefined;
  }>;
}

export default function Step4Review({
  draft,
  onUpdate,
  onSubmit,
  onBack,
  onEditStep,
}: Step4ReviewProps) {
  const [signature, setSignature] = useState(draft.signature || "");
  const [agreedToTerms, setAgreedToTerms] = useState(draft.agreedToTerms || false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get formatted timestamp
  const timestamp = useMemo(() => {
    const now = new Date();
    return now.toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  // Get masked IP (placeholder)
  const maskedIP = "192.168.***.***";

  // Format phone number for display
  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return phone;
  };

  // Get selected eligibility tags labels
  const getSelectedTagsLabels = useCallback(() => {
    if (!draft.eligibilityTags || draft.eligibilityTags.length === 0) {
      return "None selected";
    }

    const labels: string[] = [];
    ELIGIBILITY_TAG_GROUPS.forEach((group) => {
      group.tags.forEach((tag) => {
        if (draft.eligibilityTags?.includes(tag.id)) {
          labels.push(tag.label);
        }
      });
    });

    return labels.join(", ");
  }, [draft.eligibilityTags]);

  // Get uploaded documents summary
  const getDocumentsSummary = useCallback(() => {
    if (!draft.documents || draft.documents.length === 0) {
      return "No documents uploaded";
    }

    return draft.documents
      .map((doc) => {
        const docType = DOCUMENT_TYPES.find((dt) => dt.id === doc.type);
        return docType?.label || doc.type;
      })
      .join(", ");
  }, [draft.documents]);

  // Build review sections
  const reviewSections: ReviewSection[] = useMemo(
    () => [
      {
        title: "Contact Information",
        step: 1,
        items: [
          { label: "Full Name", value: draft.fullName },
          { label: "Phone", value: draft.phone ? formatPhone(draft.phone) : undefined },
          { label: "Email", value: draft.email },
        ],
      },
      {
        title: "Eligibility",
        step: 2,
        items: [
          { label: "Selected Tags", value: getSelectedTagsLabels() },
        ],
      },
      {
        title: "Documents",
        step: 3,
        items: [
          { label: "Uploaded", value: getDocumentsSummary() },
        ],
      },
    ],
    [draft, getSelectedTagsLabels, getDocumentsSummary]
  );

  const handleSignatureChange = useCallback((text: string) => {
    // Only allow letters, spaces, and hyphens for names
    const cleaned = text.replace(/[^a-zA-Z\s-]/g, "");
    setSignature(cleaned);
    onUpdate({ signature: cleaned });
  }, [onUpdate]);

  const handleTermsToggle = useCallback(() => {
    const newValue = !agreedToTerms;
    setAgreedToTerms(newValue);
    onUpdate({ agreedToTerms: newValue });
  }, [agreedToTerms, onUpdate]);

  const handleSubmit = useCallback(async () => {
    if (!signature.trim()) {
      Alert.alert("Signature Required", "Please type your full name to sign the application.");
      return;
    }

    if (signature.trim().length < 3) {
      Alert.alert("Invalid Signature", "Please enter your full legal name.");
      return;
    }

    if (!agreedToTerms) {
      Alert.alert("Terms Required", "Please agree to the terms and conditions to continue.");
      return;
    }

    setIsSubmitting(true);

    // Simulate submission delay
    setTimeout(() => {
      setIsSubmitting(false);
      onSubmit();
    }, 1500);
  }, [signature, agreedToTerms, onSubmit]);

  const canSubmit = signature.trim().length >= 3 && agreedToTerms && !isSubmitting;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Review Your Application</Text>
          <Text style={styles.subtitle}>
            Please review all information before submitting. You can edit any section if needed.
          </Text>
        </View>

        {/* Review Sections */}
        {reviewSections.map((section) => (
          <View key={section.step} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => onEditStep(section.step)}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${section.title}`}
              >
                <Ionicons name="pencil" size={16} color={colors.gold} />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sectionContent}>
              {section.items.map((item, index) => (
                <View key={index} style={styles.reviewItem}>
                  <Text style={styles.reviewLabel}>{item.label}:</Text>
                  <Text style={styles.reviewValue} numberOfLines={2}>
                    {item.value || "Not provided"}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Electronic Signature Section */}
        <View style={styles.signatureSection}>
          <Text style={styles.sectionTitle}>Electronic Signature</Text>

          <View style={styles.signatureInfo}>
            <Ionicons name="information-circle" size={20} color={colors.gold} />
            <Text style={styles.signatureInfoText}>
              By typing your full legal name below, you are electronically signing this application
              and certifying that all information provided is true and accurate.
            </Text>
          </View>

          <Text style={styles.inputLabel}>Type your full name</Text>
          <TextInput
            style={styles.signatureInput}
            value={signature}
            onChangeText={handleSignatureChange}
            placeholder="John Doe"
            placeholderTextColor={colors.gray}
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={50}
            accessibilityLabel="Signature input"
            accessibilityHint="Type your full legal name to sign"
          />

          {signature.trim().length > 0 && (
            <View style={styles.signaturePreview}>
              <Text style={styles.signaturePreviewLabel}>Your signature:</Text>
              <Text style={styles.signatureText}>{signature}</Text>
              <Text style={styles.signatureMetadata}>
                Signed on {timestamp} from IP: {maskedIP}
              </Text>
            </View>
          )}
        </View>

        {/* Terms and Conditions */}
        <View style={styles.termsSection}>
          <TouchableOpacity
            style={styles.termsRow}
            onPress={handleTermsToggle}
            activeOpacity={0.7}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreedToTerms }}
            accessibilityLabel="Terms and conditions checkbox"
          >
            <Checkbox
              value={agreedToTerms}
              onValueChange={handleTermsToggle}
            />
            <Text style={styles.termsText}>
              I have read and agree to the{" "}
              <Text style={styles.termsLink}>Terms and Conditions</Text> and{" "}
              <Text style={styles.termsLink}>Privacy Policy</Text>. I understand
              that submitting false information may result in the rejection of my
              application.
            </Text>
          </TouchableOpacity>
        </View>

        {/* Legal Notice */}
        <View style={styles.legalNotice}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.gray} />
          <Text style={styles.legalText}>
            This application is submitted under penalty of perjury. All information
            will be verified. Your data is encrypted and securely stored.
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={20} color={colors.white} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.submitButton,
              !canSubmit && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityLabel="Submit application"
            accessibilityState={{ disabled: !canSubmit }}
          >
            {isSubmitting ? (
              <>
                <Ionicons name="hourglass-outline" size={20} color={colors.black} />
                <Text style={styles.submitButtonText}>Submitting...</Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={colors.black} />
                <Text style={styles.submitButtonText}>Submit Application</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footerHint}>
          {!canSubmit
            ? "Please sign and agree to terms to submit"
            : "Your application will be submitted securely"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.gold,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: colors.white,
    lineHeight: 22,
  },
  section: {
    backgroundColor: colors.darkGray,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.gold,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  editButtonText: {
    marginLeft: spacing.xs,
    fontSize: 14,
    color: colors.gold,
  },
  sectionContent: {
    gap: spacing.sm,
  },
  reviewItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  reviewLabel: {
    fontSize: 14,
    color: colors.gray,
    minWidth: 100,
  },
  reviewValue: {
    flex: 1,
    fontSize: 14,
    color: colors.white,
    marginLeft: spacing.sm,
  },
  signatureSection: {
    backgroundColor: colors.darkGray,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  signatureInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.black,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  signatureInfoText: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 12,
    color: colors.white,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 14,
    color: colors.white,
    marginBottom: spacing.sm,
  },
  signatureInput: {
    backgroundColor: colors.black,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.white,
    minHeight: 48,
  },
  signaturePreview: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.black,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  signaturePreviewLabel: {
    fontSize: 12,
    color: colors.gray,
    marginBottom: spacing.xs,
  },
  signatureText: {
    fontSize: 24,
    fontStyle: "italic",
    color: colors.gold,
    marginBottom: spacing.sm,
  },
  signatureMetadata: {
    fontSize: 11,
    color: colors.gray,
  },
  termsSection: {
    marginBottom: spacing.lg,
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  termsText: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 14,
    color: colors.white,
    lineHeight: 20,
  },
  termsLink: {
    color: colors.gold,
    textDecorationLine: "underline",
  },
  legalNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
  },
  legalText: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 12,
    color: colors.gray,
    lineHeight: 16,
  },
  footer: {
    padding: spacing.lg,
    paddingBottom: spacing.lg + 20,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
    backgroundColor: colors.black,
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  backButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.white,
    marginLeft: spacing.sm,
  },
  submitButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.green,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.black,
    marginLeft: spacing.sm,
  },
  footerHint: {
    fontSize: 12,
    color: colors.gray,
    textAlign: "center",
    marginTop: spacing.sm,
  },
});