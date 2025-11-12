import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
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
                      (tag, idx) => (
                        <View key={idx} style={styles.tag}>
                          <Text style={styles.tagText}>{tag}</Text>
                        </View>
                      ),
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
        {application.documents && application.documents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Submitted Documents</Text>
            <View style={styles.documentsContainer}>
              {application.documents.map((doc: any, index: number) => (
                <TouchableOpacity
                  key={doc.id || index}
                  style={styles.documentCard}
                  onPress={() => {
                    // Open document URL
                    if (doc.file_url) {
                      // You can implement document viewing here
                      Alert.alert(
                        "Document",
                        `${doc.type || "Document"}\n${doc.file_name || ""}`,
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "View",
                            onPress: () => {
                              // Implement document viewer
                              console.log("View document:", doc.file_url);
                            },
                          },
                        ],
                      );
                    }
                  }}
                >
                  <Ionicons
                    name="document-attach-outline"
                    size={24}
                    color={colors.primary[500]}
                  />
                  <View style={styles.documentInfo}>
                    <Text style={styles.documentTitle}>
                      {doc.type || "Document"}
                    </Text>
                    <Text style={styles.documentSubtitle}>
                      {doc.file_name || "Uploaded document"}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={colors.gray[400]}
                  />
                </TouchableOpacity>
              ))}
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
});
