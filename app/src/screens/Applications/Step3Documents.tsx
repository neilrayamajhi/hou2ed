import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { colors, spacing, radius } from "../../theme/tokens";
import { DOCUMENT_TYPES, FILE_UPLOAD } from "../../constants/application";
import type { ApplicationDraft } from "./ApplyWizard";

interface Step3DocumentsProps {
  draft: ApplicationDraft;
  onUpdate: (updates: Partial<ApplicationDraft>) => void;
  onNext: () => void;
  onBack: () => void;
}

interface UploadedDocument {
  type: string;
  uri: string;
  name: string;
  size: number;
  uploadProgress?: number;
  error?: string;
}

export default function Step3Documents({
  draft,
  onUpdate,
  onNext,
  onBack,
}: Step3DocumentsProps) {
  const [documents, setDocuments] = useState<UploadedDocument[]>(
    draft.documents || [],
  );
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  // Update draft whenever documents change
  React.useEffect(() => {
    onUpdate({ documents });
  }, [documents, onUpdate]);

  // Remove document function (declared before checkExistingDocument)
  const removeDocument = useCallback((docType: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.type !== docType));
    setUploading((prev) => ({ ...prev, [docType]: false }));
  }, []);

  // Check if document already exists and prompt for replacement
  const checkExistingDocument = useCallback(
    (docType: string): Promise<boolean> => {
      return new Promise((resolve) => {
        if (documents.some((doc) => doc.type === docType)) {
          Alert.alert(
            "Document Already Uploaded",
            "Would you like to replace the existing document?",
            [
              {
                text: "Cancel",
                style: "cancel",
                onPress: () => resolve(false),
              },
              {
                text: "Replace",
                onPress: () => {
                  removeDocument(docType);
                  resolve(true);
                },
              },
            ],
          );
        } else {
          resolve(true);
        }
      });
    },
    [documents, removeDocument],
  );

  // Real upload to Supabase storage
  const uploadDocument = useCallback(
    async (docType: string, doc: UploadedDocument) => {
      setUploading((prev) => ({ ...prev, [docType]: true }));

      try {
        // Import storage service
        const { uploadApplicationDocument } = await import(
          "../../services/storage.service"
        );

        // Use a temporary application ID (will be updated when application is submitted)
        const tempAppId = `temp_${Date.now()}`;

        // Update progress to show upload starting
        setDocuments((prev) =>
          prev.map((d) =>
            d.type === docType ? { ...d, uploadProgress: 10 } : d,
          ),
        );

        // Upload to Supabase
        const result = await uploadApplicationDocument(
          doc.uri,
          tempAppId,
          docType,
        );

        if (result.success && result.path) {
          // Upload successful
          setDocuments((prev) =>
            prev.map((d) =>
              d.type === docType
                ? { ...d, uploadProgress: 100, uri: result.path || d.uri }
                : d,
            ),
          );
        } else {
          // Upload failed
          setDocuments((prev) =>
            prev.map((d) =>
              d.type === docType
                ? { ...d, error: result.error || "Upload failed" }
                : d,
            ),
          );
        }
      } catch (error) {
        console.error("Upload error:", error);
        setDocuments((prev) =>
          prev.map((d) =>
            d.type === docType
              ? { ...d, error: "Upload failed. Please try again." }
              : d,
          ),
        );
      } finally {
        setUploading((prev) => ({ ...prev, [docType]: false }));
      }
    },
    [],
  );

  // Handle successful document selection
  const handleDocumentSelected = useCallback(
    (docType: string, uri: string, name: string, size: number) => {
      // Validate file size
      if (size > FILE_UPLOAD.MAX_SIZE_BYTES) {
        Alert.alert("File Too Large", FILE_UPLOAD.ERROR_MESSAGES.SIZE);
        return;
      }

      const newDoc: UploadedDocument = {
        type: docType,
        uri,
        name,
        size,
        uploadProgress: 0,
      };

      setDocuments((prev) => [...prev, newDoc]);
      uploadDocument(docType, newDoc);
    },
    [uploadDocument],
  );

  const pickDocument = useCallback(
    async (docType: string) => {
      try {
        const shouldProceed = await checkExistingDocument(docType);
        if (!shouldProceed) return;

        const result = await DocumentPicker.getDocumentAsync({
          type: ["application/pdf", "image/*"],
          copyToCacheDirectory: true,
        });

        if (!result.canceled && result.assets && result.assets[0]) {
          const asset = result.assets[0];
          handleDocumentSelected(
            docType,
            asset.uri,
            asset.name,
            asset.size || 0,
          );
        }
      } catch (error) {
        console.error("Document picker error:", error);
        Alert.alert("Error", "Failed to pick document. Please try again.");
      }
    },
    [checkExistingDocument, handleDocumentSelected],
  );

  const pickImage = useCallback(
    async (docType: string) => {
      try {
        const shouldProceed = await checkExistingDocument(docType);
        if (!shouldProceed) return;

        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status !== "granted") {
          Alert.alert(
            "Permission Required",
            "Please enable photo library access to upload documents.",
          );
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets[0]) {
          const asset = result.assets[0];
          // Mock file size (image picker doesn't provide size)
          const mockSize = Math.floor(Math.random() * 2000000) + 500000; // 0.5-2.5MB
          const fileName = `${docType}_${Date.now()}.jpg`;

          handleDocumentSelected(docType, asset.uri, fileName, mockSize);
        }
      } catch (error) {
        console.error("Image picker error:", error);
        Alert.alert("Error", "Failed to pick image. Please try again.");
      }
    },
    [checkExistingDocument, handleDocumentSelected],
  );

  const retryUpload = useCallback(
    (docType: string) => {
      const doc = documents.find((d) => d.type === docType);
      if (doc) {
        // Reset error state
        setDocuments((prev) =>
          prev.map((d) =>
            d.type === docType
              ? { ...d, error: undefined, uploadProgress: 0 }
              : d,
          ),
        );
        uploadDocument(docType, doc);
      }
    },
    [documents, uploadDocument],
  );

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }, []);

  const getDocumentForType = useCallback(
    (docType: string) => {
      return documents.find((doc) => doc.type === docType);
    },
    [documents],
  );

  const allRequiredDocumentsUploaded = useMemo(() => {
    return DOCUMENT_TYPES.filter((dt) => dt.required).every((dt) =>
      documents.some((doc) => doc.type === dt.id && doc.uploadProgress === 100),
    );
  }, [documents]);

  const handleDocumentPick = (docType: string) => {
    Alert.alert(
      "Choose Upload Method",
      "How would you like to upload the document?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Photo Library", onPress: () => pickImage(docType) },
        { text: "Files", onPress: () => pickDocument(docType) },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Upload Documents</Text>
          <Text style={styles.subtitle}>
            Please upload the required documents to complete your application.
          </Text>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={colors.gold} />
          <Text style={styles.infoText}>
            Documents must be under 10MB. Accepted formats: PDF, JPG, PNG
          </Text>
        </View>

        {/* Document Types */}
        {DOCUMENT_TYPES.map((docType) => {
          const uploadedDoc = getDocumentForType(docType.id);
          const isUploading = uploading[docType.id];
          const isComplete = uploadedDoc?.uploadProgress === 100;

          return (
            <View key={docType.id} style={styles.documentSection}>
              <View style={styles.documentHeader}>
                <View style={styles.documentTitleRow}>
                  <Text style={styles.documentTitle}>
                    {docType.label}
                    {docType.required && (
                      <Text style={styles.required}> *</Text>
                    )}
                  </Text>
                  {isComplete && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={colors.green}
                    />
                  )}
                </View>
              </View>

              {uploadedDoc ? (
                <View style={styles.uploadedFile}>
                  <View style={styles.fileInfo}>
                    <Ionicons
                      name="document-outline"
                      size={24}
                      color={colors.gold}
                    />
                    <View style={styles.fileDetails}>
                      <Text style={styles.fileName} numberOfLines={1}>
                        {uploadedDoc.name}
                      </Text>
                      <Text style={styles.fileSize}>
                        {formatFileSize(uploadedDoc.size)}
                      </Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  {uploadedDoc.uploadProgress !== undefined &&
                    uploadedDoc.uploadProgress < 100 && (
                      <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                          <View
                            style={[
                              styles.progressFill,
                              { width: `${uploadedDoc.uploadProgress}%` },
                            ]}
                          />
                        </View>
                        <Text style={styles.progressText}>
                          {Math.round(uploadedDoc.uploadProgress)}%
                        </Text>
                      </View>
                    )}

                  {/* Actions */}
                  <View style={styles.fileActions}>
                    {uploadedDoc.error ? (
                      <TouchableOpacity
                        style={styles.retryButton}
                        onPress={() => retryUpload(docType.id)}
                      >
                        <Ionicons
                          name="refresh"
                          size={16}
                          color={colors.gold}
                        />
                        <Text style={styles.retryText}>Retry</Text>
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeDocument(docType.id)}
                      disabled={isUploading}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color={colors.red}
                      />
                      <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={() => handleDocumentPick(docType.id)}
                >
                  <Ionicons
                    name="cloud-upload-outline"
                    size={24}
                    color={colors.gold}
                  />
                  <Text style={styles.uploadButtonText}>
                    Tap to upload {docType.label.toLowerCase()}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {/* Privacy Note */}
        <View style={styles.privacyNote}>
          <Ionicons name="lock-closed-outline" size={16} color={colors.gray} />
          <Text style={styles.privacyText}>
            Your documents are encrypted and securely stored. They will only be
            shared with the housing provider for verification purposes.
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={20} color={colors.white} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.nextButton,
              !allRequiredDocumentsUploaded && styles.nextButtonDisabled,
            ]}
            onPress={onNext}
            disabled={!allRequiredDocumentsUploaded}
            accessibilityRole="button"
            accessibilityLabel="Continue to next step"
          >
            <Text style={styles.nextButtonText}>Next</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.black} />
          </TouchableOpacity>
        </View>

        <Text style={styles.footerHint}>
          {!allRequiredDocumentsUploaded
            ? "Please upload all required documents"
            : "All required documents uploaded"}
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
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.darkGray,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  infoText: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 14,
    color: colors.white,
    lineHeight: 20,
  },
  documentSection: {
    marginBottom: spacing.lg,
    backgroundColor: colors.darkGray,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  documentHeader: {
    marginBottom: spacing.md,
  },
  documentTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.white,
  },
  required: {
    color: colors.red,
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.borderGray,
    borderStyle: "dashed",
    borderRadius: radius.md,
    padding: spacing.lg,
    backgroundColor: colors.black,
  },
  uploadButtonText: {
    marginLeft: spacing.sm,
    fontSize: 14,
    color: colors.gold,
  },
  uploadedFile: {
    backgroundColor: colors.black,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  fileInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  fileDetails: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  fileName: {
    fontSize: 14,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  fileSize: {
    fontSize: 12,
    color: colors.gray,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.borderGray,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.gold,
  },
  progressText: {
    marginLeft: spacing.sm,
    fontSize: 12,
    color: colors.white,
    minWidth: 35,
  },
  fileActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  retryText: {
    marginLeft: spacing.xs,
    fontSize: 14,
    color: colors.gold,
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  removeText: {
    marginLeft: spacing.xs,
    fontSize: 14,
    color: colors.red,
  },
  privacyNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
  },
  privacyText: {
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
  nextButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
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
