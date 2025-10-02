import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius } from "../../theme/tokens";
import { useAuthStore } from "../../state/useAuthStore";
import { contactInfoSchema, ContactInfo } from "../../schemas/application";
import type { ApplicationDraft } from "./ApplyWizard";

interface Step1InfoProps {
  draft: ApplicationDraft;
  onUpdate: (updates: Partial<ApplicationDraft>) => void;
  onNext: () => void;
}

export default function Step1Info({ draft, onUpdate, onNext }: Step1InfoProps) {
  const user = useAuthStore((state) => state.user);
  const [showPhoneInfo, setShowPhoneInfo] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
  } = useForm<ContactInfo>({
    resolver: zodResolver(contactInfoSchema),
    mode: "onChange",
    defaultValues: {
      fullName: draft.fullName || "",
      phone: draft.phone || "",
      email: draft.email || "",
    },
  });

  // Prefill from user profile if available
  useEffect(() => {
    if (user && !draft.fullName) {
      setValue("fullName", user.fullName || "");
      setValue("email", user.email || "");
      // Phone is not available in User type, skip it
      // Update draft with prefilled values
      onUpdate({
        fullName: user.fullName || "",
        email: user.email || "",
      });
    }
  }, [user]);

  const onSubmit = (data: ContactInfo) => {
    onUpdate(data);
    onNext();
  };

  const handleFieldChange = (field: keyof ContactInfo, value: string) => {
    // Update draft in real-time for persistence
    onUpdate({ [field]: value });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.form}>
          {/* Full Name Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              Full Name <Text style={styles.required}>*</Text>
            </Text>
            <Controller
              control={control}
              name="fullName"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <View
                    style={[
                      styles.inputWrapper,
                      errors.fullName && styles.inputWrapperError,
                    ]}
                  >
                    <Ionicons
                      name="person-outline"
                      size={20}
                      color={errors.fullName ? colors.red : colors.gray}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your full name"
                      placeholderTextColor={colors.gray}
                      value={value}
                      onChangeText={(text) => {
                        onChange(text);
                        handleFieldChange("fullName", text);
                      }}
                      onBlur={onBlur}
                      autoCapitalize="words"
                      autoCorrect={false}
                      accessibilityLabel="Full name"
                      accessibilityHint="Enter your full legal name"
                    />
                  </View>
                  {errors.fullName && (
                    <Text style={styles.errorText}>{errors.fullName.message}</Text>
                  )}
                </View>
              )}
            />
          </View>

          {/* Phone Field */}
          <View style={styles.fieldContainer}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>
                Phone Number <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                onPress={() => setShowPhoneInfo(!showPhoneInfo)}
                accessibilityRole="button"
                accessibilityLabel="Phone number info"
              >
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={colors.gold}
                />
              </TouchableOpacity>
            </View>
            {showPhoneInfo && (
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  We'll use this to contact you about your application. Standard messaging rates may apply.
                </Text>
              </View>
            )}
            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <View
                    style={[
                      styles.inputWrapper,
                      errors.phone && styles.inputWrapperError,
                    ]}
                  >
                    <Ionicons
                      name="call-outline"
                      size={20}
                      color={errors.phone ? colors.red : colors.gray}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="(555) 123-4567"
                      placeholderTextColor={colors.gray}
                      value={value}
                      onChangeText={(text) => {
                        onChange(text);
                        handleFieldChange("phone", text);
                      }}
                      onBlur={onBlur}
                      keyboardType="phone-pad"
                      autoCorrect={false}
                      accessibilityLabel="Phone number"
                      accessibilityHint="Enter your phone number"
                    />
                  </View>
                  {errors.phone && (
                    <Text style={styles.errorText}>{errors.phone.message}</Text>
                  )}
                </View>
              )}
            />
          </View>

          {/* Email Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              Email Address <Text style={styles.required}>*</Text>
            </Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <View
                    style={[
                      styles.inputWrapper,
                      errors.email && styles.inputWrapperError,
                    ]}
                  >
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color={errors.email ? colors.red : colors.gray}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="your.email@example.com"
                      placeholderTextColor={colors.gray}
                      value={value}
                      onChangeText={(text) => {
                        onChange(text);
                        handleFieldChange("email", text);
                      }}
                      onBlur={onBlur}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      accessibilityLabel="Email address"
                      accessibilityHint="Enter your email address"
                    />
                  </View>
                  {errors.email && (
                    <Text style={styles.errorText}>{errors.email.message}</Text>
                  )}
                </View>
              )}
            />
          </View>

          {/* Privacy Notice */}
          <View style={styles.privacyNotice}>
            <Ionicons name="lock-closed-outline" size={16} color={colors.gold} />
            <Text style={styles.privacyText}>
              Your information is secure and will only be shared with the housing provider.
            </Text>
          </View>

          {/* Helper Text */}
          <View style={styles.helperContainer}>
            <Text style={styles.helperTitle}>Why we need this information:</Text>
            <View style={styles.helperItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.helperText}>
                To contact you about your application status
              </Text>
            </View>
            <View style={styles.helperItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.helperText}>
                To schedule interviews or tours if needed
              </Text>
            </View>
            <View style={styles.helperItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.helperText}>
                To send important updates about the listing
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Next Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.nextButton,
            !isValid && styles.nextButtonDisabled,
          ]}
          onPress={handleSubmit(onSubmit)}
          disabled={!isValid}
          accessibilityRole="button"
          accessibilityLabel="Continue to next step"
          accessibilityState={{ disabled: !isValid }}
        >
          <Text style={styles.nextButtonText}>Next</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.black} />
        </TouchableOpacity>
        <Text style={styles.footerHint}>
          Your progress is automatically saved
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  form: {
    padding: spacing.lg,
  },
  fieldContainer: {
    marginBottom: spacing.lg,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.white,
    marginBottom: spacing.sm,
  },
  required: {
    color: colors.red,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.black,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  inputWrapperError: {
    borderColor: colors.red,
  },
  input: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 16,
    color: colors.white,
  },
  errorText: {
    fontSize: 12,
    color: colors.red,
    marginTop: spacing.xs,
    marginLeft: spacing.sm,
  },
  infoBox: {
    backgroundColor: colors.darkGray,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: 12,
    color: colors.white,
    lineHeight: 16,
  },
  privacyNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.darkGray,
    borderRadius: radius.md,
    padding: spacing.md,
    marginVertical: spacing.lg,
  },
  privacyText: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 14,
    color: colors.white,
    lineHeight: 20,
  },
  helperContainer: {
    marginTop: spacing.md,
  },
  helperTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.gold,
    marginBottom: spacing.sm,
  },
  helperItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.xs,
  },
  bulletPoint: {
    fontSize: 14,
    color: colors.gold,
    width: 15,
  },
  helperText: {
    flex: 1,
    fontSize: 14,
    color: colors.white,
    lineHeight: 20,
  },
  footer: {
    padding: spacing.lg,
    paddingBottom: spacing.lg + 20,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
    backgroundColor: colors.black,
  },
  nextButton: {
    flexDirection: "row",
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.black,
    marginRight: spacing.sm,
  },
  footerHint: {
    fontSize: 12,
    color: colors.gray,
    textAlign: "center",
    marginTop: spacing.sm,
  },
});