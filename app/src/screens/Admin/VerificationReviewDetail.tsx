import React from "react";
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
import { colors, spacing, typography, radius, shadows } from "../../theme/tokens";
import { RootStackNavigationProp } from "../../navigation/types";
import {
  getVerificationDetail,
  setVerificationStatus,
  type VerificationStatus,
} from "../../services/verification.service";
import StatusBadge, { type StatusBadgeTone } from "../../components/admin/StatusBadge";
import { glowCard } from "../../components/admin/adminTheme";
import AdminButton from "../../components/admin/AdminButton";
import AvatarInitial from "../../components/admin/AvatarInitial";

const STATUS_TONE: Record<VerificationStatus, StatusBadgeTone> = {
  unsubmitted: "neutral",
  pending: "warning",
  verified: "success",
  rejected: "danger",
};

type VerificationReviewDetailRouteProp = RouteProp<
  { VerificationReviewDetail: { userId: string } },
  "VerificationReviewDetail"
>;

export default function VerificationReviewDetail() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<VerificationReviewDetailRouteProp>();
  const queryClient = useQueryClient();
  const { userId } = route.params;

  const {
    data: verification,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["adminVerificationDetail", userId],
    queryFn: () => getVerificationDetail(userId),
  });

  const statusMutation = useMutation({
    mutationFn: (status: "verified" | "rejected") =>
      setVerificationStatus(userId, status),
    onSuccess: async (result) => {
      if (result.success) {
        await queryClient.invalidateQueries({
          queryKey: ["adminPendingVerifications"],
        });
        navigation.goBack();
      } else {
        Alert.alert("Error", result.error || "Failed to update verification");
      }
    },
  });

  const handleApprove = () => {
    if (!verification) return;
    Alert.alert(
      "Approve Verification",
      `Mark ${verification.fullName} as verified?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Approve", onPress: () => statusMutation.mutate("verified") },
      ],
    );
  };

  const handleReject = () => {
    if (!verification) return;
    Alert.alert(
      "Reject Verification",
      `Reject ${verification.fullName}'s verification submission?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: () => statusMutation.mutate("rejected"),
        },
      ],
    );
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
        <Text style={styles.headerTitle}>Verification Detail</Text>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : isError || !verification ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.red} />
          <Text style={styles.errorText}>Failed to load verification</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.card, styles.identityCard]}>
            <View style={styles.identityRow}>
              <AvatarInitial name={verification.fullName || verification.email} size={52} />
              <View style={styles.identityBody}>
                <Text style={styles.name}>{verification.fullName}</Text>
                <Text style={styles.email}>{verification.email}</Text>
              </View>
            </View>
            <StatusBadge
              label={verification.verificationStatus || "unsubmitted"}
              tone={STATUS_TONE[verification.verificationStatus || "unsubmitted"]}
            />
          </View>

          <Text style={styles.eyebrow}>Submitted Documents</Text>
          <View style={styles.card}>
            {verification.verificationDocuments ? (
              <Text style={styles.documentsText}>
                {JSON.stringify(verification.verificationDocuments, null, 2)}
              </Text>
            ) : (
              <Text style={styles.noDocumentsText}>
                No documents submitted.
              </Text>
            )}
          </View>

          {verification.verificationStatus === "pending" && (
            <>
              <Text style={styles.eyebrow}>Decision</Text>
              <AdminButton
                label="Approve"
                variant="secondary"
                disabled={statusMutation.isPending}
                loading={statusMutation.isPending && statusMutation.variables === "verified"}
                onPress={handleApprove}
              />
              <AdminButton
                label="Reject"
                variant="destructive"
                disabled={statusMutation.isPending}
                loading={statusMutation.isPending && statusMutation.variables === "rejected"}
                onPress={handleReject}
              />
            </>
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
    borderBottomWidth: 2,
    borderBottomColor: "rgba(212, 175, 55, 0.25)",
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
  identityCard: { ...glowCard },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  identityBody: { flex: 1 },
  name: {
    fontSize: typography.sizes.xl,
    fontWeight: "700",
    color: colors.gray[50],
    marginBottom: 2,
  },
  email: { fontSize: typography.sizes.sm, color: colors.gray[400] },
  eyebrow: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.gray[500],
    marginBottom: spacing.sm,
  },
  documentsText: {
    fontSize: typography.sizes.xs,
    color: colors.gray[300],
    fontFamily: "monospace",
  },
  noDocumentsText: { fontSize: typography.sizes.sm, color: colors.gray[500] },
});
