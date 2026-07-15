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
} from "../../services/verification.service";

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
          <View style={styles.card}>
            <Text style={styles.name}>{verification.fullName}</Text>
            <Text style={styles.email}>{verification.email}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {verification.verificationStatus || "unsubmitted"}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Submitted Documents</Text>
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
              <Text style={styles.sectionTitle}>Decision</Text>
              <TouchableOpacity
                style={styles.actionButton}
                disabled={statusMutation.isPending}
                onPress={handleApprove}
              >
                <Text style={styles.actionButtonText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.destructiveButton]}
                disabled={statusMutation.isPending}
                onPress={handleReject}
              >
                <Text style={styles.actionButtonText}>Reject</Text>
              </TouchableOpacity>
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
  name: {
    fontSize: typography.sizes.xl,
    fontWeight: "700",
    color: colors.gray[50],
    marginBottom: spacing.xs,
  },
  email: { fontSize: typography.sizes.sm, color: colors.gray[400], marginBottom: spacing.sm },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.primary[500],
  },
  badgeText: { fontSize: typography.sizes.xs, fontWeight: "600", color: colors.gray[900] },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.gray[50],
    marginBottom: spacing.sm,
  },
  documentsText: {
    fontSize: typography.sizes.xs,
    color: colors.gray[300],
    fontFamily: "monospace",
  },
  noDocumentsText: { fontSize: typography.sizes.sm, color: colors.gray[500] },
  actionButton: {
    backgroundColor: colors.gray[850],
    borderWidth: 1,
    borderColor: colors.gray[800],
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  destructiveButton: { backgroundColor: colors.red, borderColor: colors.red },
  actionButtonText: { fontSize: typography.sizes.md, fontWeight: "600", color: colors.white },
});
