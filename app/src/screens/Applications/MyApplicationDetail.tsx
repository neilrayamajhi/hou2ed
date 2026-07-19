import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { colors, spacing, typography, radius, shadows } from "../../theme/tokens";
import { RootStackNavigationProp } from "../../navigation/types";
import { getApplication, type Application } from "../../services/application.service";
import { getDocumentSignedUrl } from "../../services/storage.service";

type MyApplicationDetailRouteProp = RouteProp<
  { MyApplicationDetail: { applicationId: string } },
  "MyApplicationDetail"
>;

type ApplicationWithListing = Application & {
  listing?: {
    id: string;
    title: string;
    address?: string;
    city?: string;
    state?: string;
  };
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  new: "Submitted",
  docs_needed: "Docs Needed",
  under_review: "Under Review",
  interview_scheduled: "Interview Scheduled",
  approved: "Approved",
  rejected: "Rejected",
  waitlisted: "Waitlisted",
  withdrawn: "Withdrawn",
};

const STATUS_COLOR: Record<string, string> = {
  draft: colors.gray[600],
  new: colors.primary[500],
  docs_needed: colors.amber,
  under_review: colors.primary[400],
  interview_scheduled: colors.primary[300],
  approved: colors.green,
  rejected: colors.red,
  waitlisted: colors.amber,
  withdrawn: colors.gray[500],
};

export default function MyApplicationDetail() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<MyApplicationDetailRouteProp>();
  const { applicationId } = route.params;

  const {
    data: application,
    isLoading,
    isError,
  } = useQuery<ApplicationWithListing | null>({
    queryKey: ["myApplicationDetail", applicationId],
    queryFn: () => getApplication(applicationId) as Promise<ApplicationWithListing | null>,
  });

  const handleOpenDocument = async (doc: any) => {
    const signedUrl = await getDocumentSignedUrl(doc.file_url);
    if (!signedUrl) {
      Alert.alert("Unavailable", "This document couldn't be opened right now.");
      return;
    }
    Linking.openURL(signedUrl);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={colors.gray[50]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Application</Text>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : isError || !application ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.red} />
          <Text style={styles.errorText}>Failed to load application</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <Text style={styles.listingTitle}>
              {application.listing?.title || "Listing"}
            </Text>
            {(application.listing?.city || application.listing?.state) && (
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={16} color={colors.gray[400]} />
                <Text style={styles.detailText}>
                  {[application.listing?.city, application.listing?.state]
                    .filter(Boolean)
                    .join(", ")}
                </Text>
              </View>
            )}
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: STATUS_COLOR[application.status] || colors.gray[600] },
              ]}
            >
              <Text style={styles.statusText}>
                {STATUS_LABEL[application.status] || application.status}
              </Text>
            </View>
          </View>

          <Text style={styles.eyebrow}>Your Information</Text>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Name</Text>
            <Text style={styles.fieldValue}>
              {application.application_data?.fullName || "—"}
            </Text>
            <Text style={styles.fieldLabel}>Phone</Text>
            <Text style={styles.fieldValue}>
              {application.application_data?.phone || "—"}
            </Text>
            <Text style={styles.fieldLabel}>Email</Text>
            <Text style={styles.fieldValue}>
              {application.application_data?.email || "—"}
            </Text>
            {application.application_data?.additionalInfo && (
              <>
                <Text style={styles.fieldLabel}>Additional Info</Text>
                <Text style={styles.fieldValue}>
                  {application.application_data.additionalInfo}
                </Text>
              </>
            )}
          </View>

          {application.documents && application.documents.length > 0 && (
            <>
              <Text style={styles.eyebrow}>Documents</Text>
              <View style={styles.card}>
                {application.documents.map((doc: any) => (
                  <TouchableOpacity
                    key={doc.id}
                    style={styles.documentRow}
                    onPress={() => handleOpenDocument(doc)}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${doc.file_name || doc.type}`}
                  >
                    <Ionicons name="document-text-outline" size={18} color={colors.primary[400]} />
                    <Text style={styles.documentName} numberOfLines={1}>
                      {doc.file_name || doc.type}
                    </Text>
                    <Ionicons name="open-outline" size={16} color={colors.gray[500]} />
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {application.notes && (
            <>
              <Text style={styles.eyebrow}>Notes from Provider</Text>
              <View style={styles.card}>
                <Text style={styles.fieldValue}>{application.notes}</Text>
              </View>
            </>
          )}

          {application.consent_signature && (
            <Text style={styles.signatureNote}>
              Signed{" "}
              {application.consent_timestamp
                ? new Date(application.consent_timestamp).toLocaleString()
                : ""}
            </Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[900] },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[800],
  },
  backButton: { padding: spacing.xs, marginRight: spacing.md },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: "700",
    color: colors.gray[50],
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  errorText: { fontSize: typography.sizes.md, color: colors.red, marginTop: spacing.md },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing["5xl"] },
  card: {
    backgroundColor: colors.gray[850],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray[800],
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.subtle,
  },
  listingTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: "700",
    color: colors.gray[50],
    marginBottom: spacing.sm,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  detailText: { fontSize: typography.sizes.sm, color: colors.gray[300] },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  statusText: { fontSize: typography.sizes.xs, fontWeight: "600", color: colors.white },
  eyebrow: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.gray[500],
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    fontSize: typography.sizes.xs,
    color: colors.gray[500],
    marginTop: spacing.sm,
  },
  fieldValue: {
    fontSize: typography.sizes.md,
    color: colors.gray[50],
    marginTop: 2,
  },
  documentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  documentName: { flex: 1, fontSize: typography.sizes.sm, color: colors.gray[200] },
  signatureNote: {
    fontSize: typography.sizes.xs,
    color: colors.gray[500],
    textAlign: "center",
  },
});
