import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { colors, spacing, typography, radius } from "../../theme/tokens";
import { RootStackNavigationProp } from "../../navigation/types";
import {
  listPendingVerifications,
  type VerificationSummary,
} from "../../services/verification.service";
import AvatarInitial from "../../components/admin/AvatarInitial";

export default function VerificationReviewList() {
  const navigation = useNavigation<RootStackNavigationProp>();

  const {
    data: verifications,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["adminPendingVerifications"],
    queryFn: listPendingVerifications,
  });

  const renderItem = ({ item }: { item: VerificationSummary }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("VerificationReviewDetail", { userId: item.id })}
      accessibilityRole="button"
      accessibilityLabel={`Review ${item.fullName}`}
      activeOpacity={0.7}
    >
      <AvatarInitial name={item.fullName || item.email} />
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>
          {item.fullName}
        </Text>
        <Text style={styles.cardEmail} numberOfLines={1}>
          {item.email}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.gray[600]} />
    </TouchableOpacity>
  );

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
        <Text style={styles.headerTitle}>Verification Review</Text>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : isError ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.red} />
          <Text style={styles.errorText}>Failed to load verifications</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={verifications || []}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContainer,
            (!verifications || verifications.length === 0) &&
              styles.emptyListContainer,
          ]}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={40}
                  color={colors.gray[600]}
                />
              </View>
              <Text style={styles.emptyStateTitle}>Nothing to review</Text>
              <Text style={styles.emptyStateSubtitle}>
                There's no provider document submission flow in the app yet,
                so this list will stay empty until that's built. This screen
                is ready for when it is.
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary[500]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
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
  errorText: {
    fontSize: typography.sizes.md,
    color: colors.red,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  retryButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary[500],
    borderRadius: radius.md,
  },
  retryButtonText: { fontSize: typography.sizes.md, fontWeight: "600", color: colors.gray[900] },
  listContainer: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  emptyListContainer: { flexGrow: 1 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing["3xl"],
    paddingHorizontal: spacing.xl,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: colors.gray[850],
    borderWidth: 1,
    borderColor: colors.gray[800],
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: "600",
    color: colors.gray[300],
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyStateSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.gray[500],
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.gray[850],
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[800],
  },
  cardBody: { flex: 1 },
  cardName: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.gray[50],
    marginBottom: 2,
  },
  cardEmail: { fontSize: typography.sizes.sm, color: colors.gray[400] },
});
