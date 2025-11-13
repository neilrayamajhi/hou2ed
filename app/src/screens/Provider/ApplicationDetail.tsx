import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Image,
  Dimensions,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  colors,
  spacing,
  typography,
  radius,
  shadows,
} from "../../theme/tokens";
import { RootStackNavigationProp } from "../../navigation/types";
import {
  getApplication,
  updateApplicationStatus,
} from "../../services/application.service";
import type { ApplicationStatus } from "../../services/application.service";
import { getDocumentSignedUrl } from "../../services/storage.service";
import { supabase } from "../../lib/supabase";

type ApplicationDetailRouteProp = RouteProp<
  { ApplicationDetail: { applicationId: string } },
  "ApplicationDetail"
>;

export default function ApplicationDetail() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<ApplicationDetailRouteProp>();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");
  const [seekerProfile, setSeekerProfile] = useState<any>(null);

  const [documents, setDocuments] = useState<any[]>([]);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ uri: string; title: string } | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);

  const { width: screenWidth } = Dimensions.get('window');

  const {
    data: application,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["application", route.params.applicationId],
    queryFn: async () => {
      const app = await getApplication(route.params.applicationId);

      // Fetch seeker profile if application exists
      if (app?.seeker_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, email, full_name, role")
          .eq("id", app.seeker_id)
          .single();

        setSeekerProfile(profile);
      }

      // Fetch documents separately
      if (app?.id) {
        const { data: docs, error } = await supabase
          .from("documents")
          .select("*")
          .eq("application_id", app.id)
          .order("created_at", { ascending: false });

        if (!error && docs) {
          setDocuments(docs);
        }
      }

      return app;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      status,
      note,
    }: {
      status: ApplicationStatus;
      note?: string;
    }) => {
      return updateApplicationStatus(route.params.applicationId, status, note);
    },
    onSuccess: async (result) => {
      if (result.success) {
        await queryClient.invalidateQueries({
          queryKey: ["providerApplications"],
        });
        await queryClient.invalidateQueries({
          queryKey: ["application", route.params.applicationId],
        });
        navigation.goBack();
      } else {
        Alert.alert("Error", result.error || "Failed to update application");
      }
    },
  });

  const handleApprove = () => {
    Alert.alert(
      "Approve Application",
      "Are you sure you want to approve this application?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          style: "default",
          onPress: () => {
            updateStatusMutation.mutate({
              status: "approved",
              note: notes || "Application approved",
            });
          },
        },
      ],
    );
  };

  const handleReject = () => {
    Alert.alert(
      "Reject Application",
      "Are you sure you want to reject this application?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: () => {
            updateStatusMutation.mutate({
              status: "rejected",
              note: notes || "Application rejected",
            });
          },
        },
      ],
    );
  };

  const handleMarkUnderReview = () => {
    updateStatusMutation.mutate({
      status: "under_review",
      note: notes || "Application under review",
    });
  };

  const getStatusColor = (status: ApplicationStatus) => {
    switch (status) {
      case "new":
        return colors.blue;
      case "under_review":
        return colors.yellow;
      case "approved":
        return colors.green;
      case "rejected":
        return colors.red;
      case "waitlisted":
        return colors.orange;
      default:
        return colors.gray[400];
    }
  };

  const getStatusIcon = (status: ApplicationStatus) => {
    switch (status) {
      case "new":
        return "mail-unread-outline";
      case "under_review":
        return "time-outline";
      case "approved":
        return "checkmark-circle-outline";
      case "rejected":
        return "close-circle-outline";
      case "waitlisted":
        return "list-outline";
      default:
        return "document-outline";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={colors.gray[50]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Application Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !application) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={colors.gray[50]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Application Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.red} />
          <Text style={styles.errorText}>Failed to load application</Text>
        </View>
      </SafeAreaView>
    );
  }

  const canApproveOrReject = ["new", "under_review", "waitlisted"].includes(
    application.status,
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.gray[50]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Application Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Status Badge */}
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${getStatusColor(application.status)}20` },
            ]}
          >
            <Ionicons
              name={getStatusIcon(application.status) as any}
              size={20}
              color={getStatusColor(application.status)}
            />
            <Text
              style={[
                styles.statusBadgeText,
                { color: getStatusColor(application.status) },
              ]}
            >
              {application.status.replace("_", " ")}
            </Text>
          </View>
          <Text style={styles.submittedDate}>
            Submitted {formatDate(application.created_at)}
          </Text>
        </View>

        {/* Applicant Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Applicant Information</Text>
            <TouchableOpacity
              style={styles.messageButton}
              onPress={() => {
                // Navigate to messages with this seeker
                if (seekerProfile) {
                  // @ts-ignore
                  navigation.navigate("Messages", {
                    recipientId: seekerProfile.id,
                    recipientName: seekerProfile.full_name || "Applicant",
                  });
                }
              }}
            >
              <Ionicons name="chatbubble-outline" size={20} color={colors.primary[500]} />
              <Text style={styles.messageButtonText}>Message</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.avatarLarge}>
              <Ionicons name="person" size={40} color={colors.gray[500]} />
            </View>

            <View style={styles.infoRow}>
              <Ionicons
                name="person-outline"
                size={16}
                color={colors.gray[400]}
              />
              <Text style={styles.infoLabel}>Full Name</Text>
              <Text style={styles.infoValue}>
                {seekerProfile?.full_name ||
                 application.application_data?.fullName ||
                 "Not provided"}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons
                name="mail-outline"
                size={16}
                color={colors.gray[400]}
              />
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>
                {seekerProfile?.email ||
                 application.application_data?.email ||
                 "Not provided"}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons
                name="call-outline"
                size={16}
                color={colors.gray[400]}
              />
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>
                {application.application_data.phone || "Not provided"}
              </Text>
            </View>

            {application.application_data.eligibilityTags &&
              application.application_data.eligibilityTags.length > 0 && (
                <View style={styles.infoRow}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={16}
                    color={colors.gray[400]}
                  />
                  <Text style={styles.infoLabel}>Eligibility</Text>
                  <View style={styles.tagContainer}>
                    {application.application_data.eligibilityTags.map(
                      (tag, idx) => {
                        // Format the tag for display with better handling
                        const formatTag = (tag: string) => {
                          // Handle specific cases
                          const tagMappings: { [key: string]: string } = {
                            'age18plus': '18+ Years',
                            'age18-25': '18-25 Years',
                            'age26-35': '26-35 Years',
                            'age36-50': '36-50 Years',
                            'age50plus': '50+ Years',
                            'dvSurvivors': 'DV Survivors',
                            'veterans': 'Veterans',
                            'disabilities': 'Disabilities',
                            'families': 'Families',
                            'singles': 'Singles',
                            'couples': 'Couples',
                            'pets': 'Pet Friendly',
                            'lgbtq': 'LGBTQ+',
                            'seniors': 'Seniors',
                            'youth': 'Youth',
                          };

                          // Check if we have a specific mapping
                          const lowerTag = tag.toLowerCase();
                          if (tagMappings[lowerTag]) {
                            return tagMappings[lowerTag];
                          }

                          // Otherwise, format generically
                          return tag
                            .replace(/([A-Z])/g, ' $1') // Add space before capital letters
                            .replace(/_/g, ' ')
                            .replace(/\b\w/g, (l: string) => l.toUpperCase())
                            .trim();
                        };

                        return (
                          <View key={idx} style={styles.tag}>
                            <Text style={styles.tagText}>{formatTag(tag)}</Text>
                          </View>
                        );
                      },
                    )}
                  </View>
                </View>
              )}
          </View>
        </View>

        {/* Emergency Contact */}
        {application.application_data.emergencyContact && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Emergency Contact</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons
                  name="person-outline"
                  size={16}
                  color={colors.gray[400]}
                />
                <Text style={styles.infoLabel}>Name</Text>
                <Text style={styles.infoValue}>
                  {application.application_data.emergencyContact.name}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons
                  name="call-outline"
                  size={16}
                  color={colors.gray[400]}
                />
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>
                  {application.application_data.emergencyContact.phone}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons
                  name="people-outline"
                  size={16}
                  color={colors.gray[400]}
                />
                <Text style={styles.infoLabel}>Relationship</Text>
                <Text style={styles.infoValue}>
                  {application.application_data.emergencyContact.relationship}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Listing Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Listing</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons
                name="home-outline"
                size={16}
                color={colors.gray[400]}
              />
              <Text style={styles.infoLabel}>Property</Text>
              <Text style={styles.infoValue}>
                {(application as any).listing?.title || "Unknown Listing"}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons
                name="location-outline"
                size={16}
                color={colors.gray[400]}
              />
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>
                {(application as any).listing?.address || "Not available"}
              </Text>
            </View>
          </View>
        </View>

        {/* Submitted Documents */}
        {documents && documents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Submitted Documents</Text>
            <View style={styles.documentsContainer}>
              {documents.map((doc: any, index: number) => {
                // Format document type for display
                const formatDocType = (type: string) => {
                  if (!type) return "Document";
                  return type
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, (l: string) => l.toUpperCase());
                };

                return (
                  <TouchableOpacity
                    key={doc.id || index}
                    style={styles.documentCard}
                    onPress={async () => {
                      console.log("📄 Document clicked:", {
                        id: doc.id,
                        type: doc.type,
                        file_path: doc.file_path,
                        file_url: doc.file_url ? 'Present' : 'Missing',
                        file_name: doc.file_name,
                        status: doc.status
                      });

                      // Check if it's an image based on file extension or type
                      const isImage = doc.file_name?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ||
                                     doc.type === 'id' ||
                                     doc.type === 'photo' ||
                                     doc.type === 'image' ||
                                     doc.type === 'income' ||
                                     doc.type === 'proof_of_employment';

                      // Handle different document storage scenarios
                      let documentUrl = null;

                      // Priority 1: Check if we have a file_path (new storage system)
                      if (doc.file_path && !doc.file_path.includes('temp_')) {
                        try {
                          console.log("🔑 Getting signed URL for storage path:", doc.file_path);
                          const signedUrl = await getDocumentSignedUrl(doc.file_path);
                          if (signedUrl) {
                            documentUrl = signedUrl;
                            console.log("✅ Got signed URL successfully");
                          } else {
                            console.log("❌ No signed URL returned - document may not exist in storage");
                          }
                        } catch (error: any) {
                          console.error("❌ Error getting signed URL:", error);
                          console.log("Document may not exist in storage or RLS policy issue");
                        }
                      } else if (doc.file_path?.includes('temp_')) {
                        console.log("⚠️ Document has temporary path - was not properly uploaded during submission");
                      }

                      // Priority 2: Check if we have a valid http URL in file_url
                      if (!documentUrl && doc.file_url?.startsWith('http')) {
                        documentUrl = doc.file_url;
                        console.log("📎 Using existing HTTP URL from file_url field");
                      }

                      // Priority 3: Check if file_url contains a storage path (without http)
                      if (!documentUrl && doc.file_url && !doc.file_url.startsWith('file://') && !doc.file_url.includes('temp_')) {
                        // This might be a valid storage path stored in file_url field
                        try {
                          console.log("🔄 Attempting to get signed URL for path in file_url:", doc.file_url);
                          const signedUrl = await getDocumentSignedUrl(doc.file_url);
                          if (signedUrl) {
                            documentUrl = signedUrl;
                            console.log("✅ Got signed URL from file_url field");
                          }
                        } catch (error) {
                          console.log("❌ Could not get signed URL for file_url:", doc.file_url);
                        }
                      }

                      // Now handle the document based on whether we have a valid URL
                      if (documentUrl) {
                        if (isImage) {
                          // For images, open in modal
                          console.log("🖼️ Opening image in modal");
                          setImageLoadError(false); // Reset error state
                          setSelectedImage({
                            uri: documentUrl,
                            title: formatDocType(doc.type)
                          });
                          setImageModalVisible(true);
                        } else {
                          // For non-image documents (PDFs, etc.), open in browser
                          console.log("📱 Opening document in browser");
                          Alert.alert(
                            formatDocType(doc.type),
                            doc.file_name || "Document ready to view",
                            [
                              { text: "Cancel", style: "cancel" },
                              {
                                text: "Open",
                                onPress: async () => {
                                  try {
                                    const canOpen = await Linking.canOpenURL(documentUrl);
                                    if (canOpen) {
                                      await Linking.openURL(documentUrl);
                                    } else {
                                      Alert.alert("Error", "Cannot open this document URL");
                                    }
                                  } catch (error) {
                                    console.error("Error opening document:", error);
                                    Alert.alert("Error", "Failed to open document");
                                  }
                                },
                              },
                            ],
                          );
                        }
                      } else {
                        // No valid URL could be obtained
                        console.error("❌ No valid URL for document:", {
                          type: doc.type,
                          file_path: doc.file_path,
                          file_url: doc.file_url,
                          status: doc.status
                        });

                        let errorMessage = "This document cannot be viewed at this time.";

                        if (doc.status === 'upload_failed') {
                          errorMessage = "The document upload failed during submission. The applicant needs to resubmit their application.";
                        } else if (doc.file_path?.includes('temp_')) {
                          errorMessage = "The document was not properly uploaded. The applicant needs to resubmit their application.";
                        } else if (!doc.file_path && !doc.file_url) {
                          errorMessage = "No document file was uploaded. The applicant needs to resubmit their application.";
                        } else if (doc.file_path && !doc.file_path.includes('temp_')) {
                          errorMessage = "The document file cannot be found in storage. It may have been uploaded incorrectly. Please ask the applicant to resubmit.";
                        } else {
                          errorMessage = `This document was uploaded using an older system and is no longer accessible.\n\nThe applicant needs to resubmit their application with new documents.`;
                        }

                        Alert.alert(
                          "Document Not Available",
                          `${errorMessage}\n\nDocument Type: ${formatDocType(doc.type)}\nFile Name: ${doc.file_name || 'Not provided'}`
                        );
                      }
                    }}
                  >
                    <Ionicons
                      name={doc.status === 'verified' ? "checkmark-circle" : "document-attach-outline"}
                      size={24}
                      color={doc.status === 'verified' ? colors.green : colors.primary[500]}
                    />
                    <View style={styles.documentInfo}>
                      <Text style={styles.documentTitle}>
                        {formatDocType(doc.type)}
                      </Text>
                      <Text style={styles.documentSubtitle}>
                        {doc.file_name || "Uploaded document"}
                      </Text>
                      {doc.status && (
                        <Text style={[styles.documentStatus,
                          { color: doc.status === 'verified' ? colors.green : colors.gray[400] }
                        ]}>
                          {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                        </Text>
                      )}
                    </View>
                    <Ionicons
                      name="eye-outline"
                      size={20}
                      color={colors.primary[500]}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Additional Information */}
        {application.application_data.additionalInfo && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Information</Text>
            <View style={styles.messageCard}>
              <Text style={styles.messageText}>
                {application.application_data.additionalInfo}
              </Text>
            </View>
          </View>
        )}

        {/* Notes (if exists) */}
        {application.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Internal Notes</Text>
            <View style={styles.messageCard}>
              <Text style={styles.messageText}>{application.notes}</Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        {canApproveOrReject && (
          <View style={styles.actionSection}>
            <Text style={styles.sectionTitle}>Review Actions</Text>

            {application.status === "new" && (
              <TouchableOpacity
                style={styles.reviewButton}
                onPress={handleMarkUnderReview}
                disabled={updateStatusMutation.isPending}
              >
                <Ionicons
                  name="time-outline"
                  size={20}
                  color={colors.gray[900]}
                />
                <Text style={styles.reviewButtonText}>Mark Under Review</Text>
              </TouchableOpacity>
            )}

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={handleReject}
                disabled={updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.gray[900]} />
                ) : (
                  <>
                    <Ionicons
                      name="close-circle-outline"
                      size={20}
                      color={colors.gray[900]}
                    />
                    <Text style={styles.actionButtonText}>Reject</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={handleApprove}
                disabled={updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.gray[900]} />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={20}
                      color={colors.gray[900]}
                    />
                    <Text style={styles.actionButtonText}>Approve</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Decision Info (if already decided) */}
        {application.decision_date && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Decision</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={colors.gray[400]}
                />
                <Text style={styles.infoLabel}>Date</Text>
                <Text style={styles.infoValue}>
                  {formatDate(application.decision_date)}
                </Text>
              </View>
              {application.decision_note && (
                <View style={styles.infoRow}>
                  <Ionicons
                    name="document-text-outline"
                    size={16}
                    color={colors.gray[400]}
                  />
                  <Text style={styles.infoLabel}>Note</Text>
                  <Text style={styles.infoValue}>
                    {application.decision_note}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Image Viewer Modal */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedImage?.title || "Document"}</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setImageModalVisible(false);
                  setSelectedImage(null);
                  setImageLoadError(false);
                }}
              >
                <Ionicons name="close" size={28} color={colors.white} />
              </TouchableOpacity>
            </View>

            {selectedImage && (
              <View style={styles.imageContainer}>
                {imageLoadError ? (
                  <View style={styles.errorContainer}>
                    <Ionicons name="image-outline" size={64} color={colors.gray[400]} />
                    <Text style={styles.errorText}>Unable to Load Image</Text>
                    <Text style={styles.errorSubtext}>
                      This image could not be displayed. It may have been deleted or moved.
                    </Text>
                    <TouchableOpacity
                      style={styles.retryButton}
                      onPress={() => {
                        setImageModalVisible(false);
                        setImageLoadError(false);
                      }}
                    >
                      <Text style={styles.retryButtonText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <ActivityIndicator
                      size="large"
                      color={colors.primary[500]}
                      style={styles.loadingIndicator}
                    />
                    <Image
                      source={{ uri: selectedImage.uri }}
                      style={styles.fullImage}
                      resizeMode="contain"
                      onLoadStart={() => setImageLoadError(false)}
                      onError={(error) => {
                        console.error('Image load error:', error);
                        setImageLoadError(true);
                      }}
                      onLoad={() => setImageLoadError(false)}
                    />
                  </>
                )}
              </View>
            )}
          </SafeAreaView>
        </View>
      </Modal>
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
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing["3xl"],
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing["3xl"],
  },
  errorText: {
    fontSize: typography.sizes.md,
    color: colors.red,
    marginTop: spacing.md,
  },
  statusContainer: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    marginBottom: spacing.xs,
  },
  statusBadgeText: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  submittedDate: {
    fontSize: typography.sizes.sm,
    color: colors.gray[500],
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: "600",
    color: colors.gray[50],
    marginBottom: spacing.md,
  },
  infoCard: {
    backgroundColor: colors.gray[850],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray[800],
    padding: spacing.lg,
    ...shadows.subtle,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.gray[800],
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  infoLabel: {
    fontSize: typography.sizes.sm,
    color: colors.gray[400],
    width: 100,
  },
  infoValue: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.gray[50],
    fontWeight: "500",
  },
  tagContainer: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  tag: {
    backgroundColor: colors.primary[500] + "20",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  tagText: {
    fontSize: typography.sizes.xs,
    color: colors.primary[500],
    fontWeight: "500",
  },
  messageCard: {
    backgroundColor: colors.gray[850],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray[800],
    padding: spacing.lg,
    ...shadows.subtle,
  },
  messageText: {
    fontSize: typography.sizes.sm,
    color: colors.gray[300],
    lineHeight: 20,
  },
  actionSection: {
    marginTop: spacing.lg,
  },
  reviewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.yellow,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  reviewButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.gray[900],
  },
  actionButtons: {
    flexDirection: "row",
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  approveButton: {
    backgroundColor: colors.green,
  },
  rejectButton: {
    backgroundColor: colors.red,
  },
  actionButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.gray[900],
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  messageButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary[500] + "20",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  messageButtonText: {
    fontSize: typography.sizes.sm,
    color: colors.primary[500],
    fontWeight: "600",
  },
  documentsContainer: {
    gap: spacing.sm,
  },
  documentCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.gray[850],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray[800],
    padding: spacing.md,
    gap: spacing.md,
  },
  documentInfo: {
    flex: 1,
  },
  documentTitle: {
    fontSize: typography.sizes.sm,
    color: colors.gray[50],
    fontWeight: "600",
    marginBottom: 2,
  },
  documentSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.gray[400],
  },
  documentStatus: {
    fontSize: typography.sizes.xs,
    marginTop: 2,
    fontWeight: "500",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.gray[900],
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[800],
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    color: colors.white,
  },
  modalCloseButton: {
    padding: spacing.sm,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  loadingIndicator: {
    position: 'absolute',
    alignSelf: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    color: colors.gray[200],
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  errorSubtext: {
    fontSize: typography.sizes.sm,
    color: colors.gray[400],
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  retryButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: '600',
    color: colors.gray[900],
  },
});
