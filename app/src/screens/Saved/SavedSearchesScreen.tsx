import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Switch,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography, radius } from "../../theme/tokens";
import { useSavedSearches } from "../../hooks/useSavedItems";
import { RootStackNavigationProp } from "../../navigation/types";
import { supabase } from "../../lib/supabase";

export default function SavedSearchesScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { savedSearches, removeSavedSearch, refreshSavedSearches } =
    useSavedSearches();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshSavedSearches();
    setRefreshing(false);
  }, [refreshSavedSearches]);

  const handleDeleteSearch = useCallback(
    (searchId: string, searchName: string) => {
      Alert.alert(
        "Delete Saved Search",
        `Are you sure you want to delete "${searchName}"?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              removeSavedSearch(searchId);
            },
          },
        ],
      );
    },
    [removeSavedSearch],
  );

  const handleToggleNotifications = useCallback(
    async (searchId: string, currentValue: boolean) => {
      try {
        const { error } = await supabase
          .from("saved_searches")
          .update({ notification_enabled: !currentValue })
          .eq("id", searchId);

        if (error) {
          Alert.alert("Error", "Failed to update notification settings");
          return;
        }

        await refreshSavedSearches();
      } catch (err) {
        Alert.alert("Error", "Failed to update notification settings");
      }
    },
    [refreshSavedSearches],
  );

  const handleExecuteSearch = useCallback(
    (search: any) => {
      // Navigate back to search screen and apply the saved filters
      navigation.navigate("SearchScreen", {
        savedFilters: search.search_criteria,
      });
    },
    [navigation],
  );

  const renderSearchItem = useCallback(
    ({ item }: { item: any }) => (
      <View style={styles.searchCard}>
        <TouchableOpacity
          style={styles.searchContent}
          onPress={() => handleExecuteSearch(item)}
          activeOpacity={0.7}
        >
          <View style={styles.searchHeader}>
            <Ionicons
              name="search-outline"
              size={20}
              color={colors.primary[400]}
            />
            <Text style={styles.searchName}>{item.name}</Text>
          </View>

          <View style={styles.searchDetails}>
            <View style={styles.detailRow}>
              <Ionicons
                name="location-outline"
                size={14}
                color={colors.gray[400]}
              />
              <Text style={styles.detailText}>
                {item.search_criteria?.location || "Any location"}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons
                name="home-outline"
                size={14}
                color={colors.gray[400]}
              />
              <Text style={styles.detailText}>
                {item.search_criteria?.housing_type || "Any housing type"}
              </Text>
            </View>

            {item.search_criteria?.price_max && (
              <View style={styles.detailRow}>
                <Ionicons
                  name="cash-outline"
                  size={14}
                  color={colors.gray[400]}
                />
                <Text style={styles.detailText}>
                  Up to ${item.search_criteria.price_max}/mo
                </Text>
              </View>
            )}
          </View>

          <View style={styles.searchFooter}>
            <Text style={styles.dateText}>
              Created {new Date(item.created_at).toLocaleDateString()}
            </Text>
            <View style={styles.notificationToggle}>
              <Ionicons
                name="notifications-outline"
                size={16}
                color={
                  item.notification_enabled
                    ? colors.primary[400]
                    : colors.gray[500]
                }
              />
              <Switch
                value={item.notification_enabled}
                onValueChange={() =>
                  handleToggleNotifications(item.id, item.notification_enabled)
                }
                trackColor={{
                  false: colors.gray[700],
                  true: colors.primary[600],
                }}
                thumbColor={
                  item.notification_enabled
                    ? colors.primary[400]
                    : colors.gray[400]
                }
                accessibilityLabel="Toggle notifications for this search"
                accessibilityRole="switch"
              />
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteSearch(item.id, item.name)}
          accessibilityLabel="Delete saved search"
          accessibilityRole="button"
        >
          <Ionicons name="trash-outline" size={20} color={colors.red} />
        </TouchableOpacity>
      </View>
    ),
    [handleExecuteSearch, handleDeleteSearch, handleToggleNotifications],
  );

  const renderEmptyState = useCallback(
    () => (
      <View style={styles.emptyState}>
        <Ionicons name="search-outline" size={64} color={colors.gray[600]} />
        <Text style={styles.emptyTitle}>No Saved Searches</Text>
        <Text style={styles.emptyDescription}>
          Save your searches to quickly find matching listings and get notified
          when new ones are available
        </Text>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => navigation.navigate("SearchScreen")}
        >
          <Text style={styles.emptyButtonText}>Start Searching</Text>
        </TouchableOpacity>
      </View>
    ),
    [navigation],
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
        <Text style={styles.headerTitle}>Saved Searches</Text>
        <View style={styles.headerRight}>
          {savedSearches.length > 0 && (
            <Text style={styles.headerCount}>{savedSearches.length}</Text>
          )}
        </View>
      </View>

      <FlatList
        data={savedSearches}
        renderItem={renderSearchItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          savedSearches.length === 0
            ? styles.emptyContainer
            : styles.listContent
        }
        ListEmptyComponent={renderEmptyState}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        showsVerticalScrollIndicator={false}
      />
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
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[800],
  },
  backButton: {
    padding: spacing.xs,
    marginLeft: -spacing.xs,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: "700",
    color: colors.gray[50],
    flex: 1,
    textAlign: "center",
  },
  headerRight: {
    width: 40,
    alignItems: "flex-end",
  },
  headerCount: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.primary[400],
    backgroundColor: colors.gray[800],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    minWidth: 24,
    textAlign: "center",
  },
  listContent: {
    padding: spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  emptyState: {
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: "600",
    color: colors.gray[50],
    marginTop: spacing.lg,
  },
  emptyDescription: {
    fontSize: typography.sizes.sm,
    color: colors.gray[400],
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  emptyButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    marginTop: spacing.xl,
  },
  emptyButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.gray[900],
  },
  searchCard: {
    backgroundColor: colors.gray[850],
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: "hidden",
    flexDirection: "row",
  },
  searchContent: {
    flex: 1,
    padding: spacing.lg,
  },
  searchHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  searchName: {
    fontSize: typography.sizes.lg,
    fontWeight: "600",
    color: colors.gray[50],
    marginLeft: spacing.sm,
    flex: 1,
  },
  searchDetails: {
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  detailText: {
    fontSize: typography.sizes.sm,
    color: colors.gray[300],
    marginLeft: spacing.sm,
  },
  searchFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray[800],
  },
  dateText: {
    fontSize: typography.sizes.xs,
    color: colors.gray[500],
  },
  notificationToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  deleteButton: {
    backgroundColor: colors.gray[800],
    width: 60,
    justifyContent: "center",
    alignItems: "center",
  },
});
