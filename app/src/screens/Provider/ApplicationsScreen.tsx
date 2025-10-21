import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography } from "../../theme/tokens";
import { supabase } from "../../lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Application {
  id: string;
  listing_id: string;
  user_id: string;
  status: string;
  contact_info: any;
  eligibility_info: any;
  created_at: string;
  listing: {
    title: string;
  };
  user: {
    full_name: string;
    email: string;
  };
}

export default function ApplicationsScreen() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "new" | "approved" | "rejected">(
    "new",
  );

  // Fetch applications for provider's listings
  const { data: applications, isLoading } = useQuery({
    queryKey: ["provider-applications", filter],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let query = supabase
        .from("applications")
        .select(
          `
          *,
          listing:listings(title),
          user:profiles!user_id(full_name, email)
        `,
        )
        .eq("listing.provider_id", user.id)
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Application[];
    },
  });

  // Update application status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      applicationId,
      status,
    }: {
      applicationId: string;
      status: string;
    }) => {
      const { error } = await supabase
        .from("applications")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", applicationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-applications"] });
    },
  });

  const handleApprove = (application: Application) => {
    Alert.alert(
      "Approve Application",
      `Approve ${application.user.full_name}'s application?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          style: "default",
          onPress: () => {
            updateStatusMutation.mutate({
              applicationId: application.id,
              status: "approved",
            });
            Alert.alert("Success", "Application approved!");
          },
        },
      ],
    );
  };

  const handleReject = (application: Application) => {
    Alert.alert(
      "Reject Application",
      `Reject ${application.user.full_name}'s application?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: () => {
            updateStatusMutation.mutate({
              applicationId: application.id,
              status: "rejected",
            });
            Alert.alert(
              "Application Rejected",
              "The applicant will be notified.",
            );
          },
        },
      ],
    );
  };

  const handleWaitlist = (application: Application) => {
    updateStatusMutation.mutate({
      applicationId: application.id,
      status: "waitlisted",
    });
    Alert.alert("Added to Waitlist", "The applicant will be notified.");
  };

  const renderApplication = ({ item }: { item: Application }) => {
    const statusColors: Record<string, string> = {
      new: colors.primary[500],
      approved: colors.success[500],
      rejected: colors.error[500],
      waitlisted: colors.warning[500],
      under_review: colors.info[500],
    };

    return (
      <View style={styles.applicationCard}>
        <View style={styles.applicationHeader}>
          <View style={styles.flex1}>
            <Text style={styles.applicantName}>{item.user.full_name}</Text>
            <Text style={styles.listingTitle}>{item.listing.title}</Text>
            <Text style={styles.appliedDate}>
              Applied {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: statusColors[item.status] || colors.gray[500],
              },
            ]}
          >
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.contactInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="mail" size={16} color={colors.gray[400]} />
            <Text style={styles.infoText}>{item.user.email}</Text>
          </View>
          {item.contact_info?.phone && (
            <View style={styles.infoRow}>
              <Ionicons name="call" size={16} color={colors.gray[400]} />
              <Text style={styles.infoText}>{item.contact_info.phone}</Text>
            </View>
          )}
        </View>

        {item.status === "new" && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleApprove(item)}
              disabled={updateStatusMutation.isPending}
            >
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={colors.white}
              />
              <Text style={styles.actionButtonText}>Approve</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.waitlistButton]}
              onPress={() => handleWaitlist(item)}
              disabled={updateStatusMutation.isPending}
            >
              <Ionicons name="time" size={20} color={colors.gray[900]} />
              <Text
                style={[styles.actionButtonText, { color: colors.gray[900] }]}
              >
                Waitlist
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleReject(item)}
              disabled={updateStatusMutation.isPending}
            >
              <Ionicons name="close-circle" size={20} color={colors.white} />
              <Text style={styles.actionButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Applications</Text>
        <Text style={styles.headerSubtitle}>
          Manage applications to your listings
        </Text>
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        {(["all", "new", "approved", "rejected"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f && styles.filterTextActive,
              ]}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[400]} />
        </View>
      ) : (
        <FlatList
          data={applications || []}
          renderItem={renderApplication}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="document-text-outline"
                size={64}
                color={colors.gray[600]}
              />
              <Text style={styles.emptyText}>No applications yet</Text>
              <Text style={styles.emptySubtext}>
                Applications will appear here when seekers apply to your
                listings
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[900],
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[800],
  },
  headerTitle: {
    fontSize: typography.sizes["2xl"],
    fontWeight: typography.weights.bold,
    color: colors.gray[50],
  },
  headerSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.gray[400],
    marginTop: spacing.xs,
  },
  filters: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.gray[700],
    backgroundColor: colors.gray[800],
  },
  filterChipActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  filterText: {
    fontSize: typography.sizes.sm,
    color: colors.gray[400],
  },
  filterTextActive: {
    color: colors.gray[900],
    fontWeight: typography.weights.semibold,
  },
  listContent: {
    padding: spacing.lg,
  },
  applicationCard: {
    backgroundColor: colors.gray[850],
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  applicationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  flex1: {
    flex: 1,
  },
  applicantName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.gray[50],
  },
  listingTitle: {
    fontSize: typography.sizes.sm,
    color: colors.primary[400],
    marginTop: spacing.xs,
  },
  appliedDate: {
    fontSize: typography.sizes.xs,
    color: colors.gray[500],
    marginTop: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    height: 28,
    justifyContent: "center",
  },
  statusText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
  contactInfo: {
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  infoText: {
    fontSize: typography.sizes.sm,
    color: colors.gray[300],
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    borderRadius: 8,
    gap: spacing.xs,
  },
  approveButton: {
    backgroundColor: colors.success[500],
  },
  waitlistButton: {
    backgroundColor: colors.warning[500],
  },
  rejectButton: {
    backgroundColor: colors.error[500],
  },
  actionButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    paddingVertical: spacing.xl * 2,
    alignItems: "center",
  },
  emptyText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.gray[400],
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: typography.sizes.sm,
    color: colors.gray[500],
    textAlign: "center",
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xl,
  },
});
