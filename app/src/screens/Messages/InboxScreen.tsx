import React, { useCallback, useMemo, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { RootStackNavigationProp } from "../../navigation/types";
import { colors, spacing, typography, radius } from "../../theme/tokens";
import {
  messageService,
  ThreadWithDetails,
} from "../../services/messageService";
import { supabase } from "../../lib/supabase";
import { useI18n } from "../../i18n";
import { useAuthStore } from "../../state/useAuthStore";

function formatTimestamp(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - dateObj.getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (hours < 1) {
    const mins = Math.floor(diff / 60000);
    return `${mins}m`;
  } else if (hours < 24) {
    return `${hours}h`;
  } else if (days < 7) {
    return `${days}d`;
  } else {
    return dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function InboxScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { user, isReady } = useAuthStore(); // Get user and ready state from auth store
  const [threads, setThreads] = useState<ThreadWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [tablesMissing, setTablesMissing] = useState(false);
  const i18n = useI18n();

  // Initialize and fetch threads
  const loadThreads = useCallback(async () => {
    try {
      // Wait for auth to be ready
      if (!isReady) {
        console.log("⏳ Auth not ready yet, waiting...");
        return;
      }

      // Check if user exists
      if (!user || !user.id) {
        console.warn("No user found in auth store for InboxScreen");
        setLoading(false);
        return;
      }

      // Initialize message service with user ID from store
      const userId = await messageService.initialize(user.id);
      setCurrentUserId(userId);

      // Fetch threads
      const fetchedThreads = await messageService.getThreads();
      setThreads(fetchedThreads);
      setTablesMissing(false);
    } catch (error) {
      console.error("Error loading threads:", error);
      // Check if this is a missing table error
      if (error?.message?.includes("table") || error?.code === "PGRST205") {
        setTablesMissing(true);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, isReady]);

  // Load threads on mount and when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadThreads();

      // Subscribe to inbox updates only after initialization
      let unsubscribe: (() => void) | null = null;

      // Delay subscription to ensure initialization is complete
      const subscribeTimeout = setTimeout(() => {
        try {
          unsubscribe = messageService.subscribeToInbox(() => {
            // Reload threads when there's an update
            loadThreads();
          });
        } catch (error) {
          console.error("Failed to subscribe to inbox:", error);
        }
      }, 500);

      return () => {
        clearTimeout(subscribeTimeout);
        if (unsubscribe) {
          unsubscribe();
        }
      };
    }, [loadThreads]),
  );

  // Handle pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadThreads();
  }, [loadThreads]);

  const handleThreadPress = useCallback(
    (thread: ThreadWithDetails) => {
      // Mark messages as read when opening thread
      // Get unread message IDs from the thread
      if (thread.messages && currentUserId) {
        const unreadMessageIds = thread.messages
          .filter((msg: any) => !msg.read_by?.includes(currentUserId))
          .map((msg: any) => msg.id);

        if (unreadMessageIds.length > 0) {
          messageService.markMessagesAsRead(thread.id, unreadMessageIds).catch(error => {
            console.error("Failed to mark messages as read:", error);
          });
        }
      }

      // Get other participant for display
      const otherParticipant = thread.participants?.find(
        (p) => p.id !== currentUserId,
      );

      navigation.navigate("Thread", {
        threadId: thread.id,
        messageId: thread.id, // For backward compatibility
        applicationId: thread.application_id || "",
        propertyTitle: thread.subject || "Conversation",
        senderName: otherParticipant?.full_name || "User",
        participantId: otherParticipant?.id || "",
      });
    },
    [navigation, currentUserId],
  );

  const renderMessage = useCallback(
    ({ item }: { item: ThreadWithDetails }) => {
      // Get other participant (not the current user)
      const otherParticipant = item.participants?.find(
        (p) => p.id !== currentUserId,
      );

      if (!otherParticipant) return null;

      const avatarColors = [
        "#FF6B6B",
        "#4ECDC4",
        "#45B7D1",
        "#96CEB4",
        "#FECA57",
        "#48C9B0",
        "#9B59B6",
        "#E74C3C",
        "#3498DB",
        "#F39C12",
      ];

      // Generate consistent color based on user ID
      const colorIndex =
        otherParticipant.id.charCodeAt(0) % avatarColors.length;
      const avatarColor = avatarColors[colorIndex];

      return (
        <TouchableOpacity
          style={styles.messageCard}
          onPress={() => handleThreadPress(item)}
          activeOpacity={0.7}
        >
          <View style={styles.messageContent}>
            <View style={styles.avatarContainer}>
              {otherParticipant.avatar_url ? (
                <View style={styles.avatar}>
                  {/* In a real app, you'd use an Image component here */}
                  <Text style={styles.avatarText}>
                    {getInitials(otherParticipant.full_name)}
                  </Text>
                </View>
              ) : (
                <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                  <Text style={styles.avatarText}>
                    {getInitials(otherParticipant.full_name)}
                  </Text>
                </View>
              )}
              {item.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadCount}>{item.unreadCount}</Text>
                </View>
              )}
            </View>

            <View style={styles.messageDetails}>
              <View style={styles.messageHeader}>
                <Text style={styles.senderName} numberOfLines={1}>
                  {otherParticipant.full_name}
                </Text>
                <Text style={styles.timestamp}>
                  {item.last_message_at
                    ? formatTimestamp(item.last_message_at)
                    : ""}
                </Text>
              </View>
              {item.subject && (
                <Text style={styles.propertyTitle} numberOfLines={1}>
                  {item.subject}
                </Text>
              )}
              <Text
                style={[
                  styles.lastMessage,
                  item.unreadCount > 0 && styles.unreadMessage,
                ]}
                numberOfLines={2}
              >
                {item.lastMessage?.body ||
                  i18n.t("messages.thread.typeMessage")}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [handleThreadPress, currentUserId, i18n],
  );

  const keyExtractor = useCallback((item: ThreadWithDetails) => item.id, []);

  const ItemSeparator = useCallback(
    () => <View style={styles.separator} />,
    [],
  );

  const EmptyComponent = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Ionicons
          name="chatbubbles-outline"
          size={64}
          color={colors.gray[400]}
        />
        <Text style={styles.emptyTitle}>{i18n.t("messages.inbox.empty")}</Text>
        <Text style={styles.emptySubtitle}>
          {i18n.t("messages.inbox.emptyDesc")}
        </Text>
      </View>
    ),
    [i18n],
  );

  const TablesMissingComponent = useCallback(() => {
    const handleOpenSupabase = () => {
      Alert.alert(
        i18n.t("messages.setup.required"),
        i18n.t("messages.setup.instructions"),
        [
          {
            text: i18n.t("common.cancel"),
            style: "cancel",
          },
          {
            text: i18n.t("messages.setup.openButton"),
            onPress: () => {
              Linking.openURL(
                "https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/sql/new",
              );
            },
          },
        ],
      );
    };

    return (
      <View style={styles.setupContainer}>
        <View style={styles.setupIconContainer}>
          <Ionicons
            name="construct-outline"
            size={64}
            color={colors.primary[400]}
          />
        </View>
        <Text style={styles.setupTitle}>{i18n.t("messages.setup.title")}</Text>
        <Text style={styles.setupSubtitle}>
          {i18n.t("messages.setup.subtitle")}
        </Text>

        <View style={styles.setupSteps}>
          <Text style={styles.stepHeader}>
            {i18n.t("messages.setup.stepsHeader")}
          </Text>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>1.</Text>
            <Text style={styles.stepText}>
              {i18n.t("messages.setup.step1")}
            </Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>2.</Text>
            <Text style={styles.stepText}>
              {i18n.t("messages.setup.step2")}
            </Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>3.</Text>
            <Text style={styles.stepText}>
              {i18n.t("messages.setup.step3")}
            </Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>4.</Text>
            <Text style={styles.stepText}>
              {i18n.t("messages.setup.step4")}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.setupButton}
          onPress={handleOpenSupabase}
          activeOpacity={0.8}
        >
          <Ionicons name="open-outline" size={20} color={colors.gray[900]} />
          <Text style={styles.setupButtonText}>
            {i18n.t("messages.setup.openButton")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadThreads}
          activeOpacity={0.8}
        >
          <Text style={styles.retryButtonText}>
            {i18n.t("messages.setup.retry")}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }, [loadThreads, i18n]);

  const sortedThreads = useMemo(
    () =>
      [...threads].sort((a, b) => {
        const aTime = new Date(a.last_message_at || 0).getTime();
        const bTime = new Date(b.last_message_at || 0).getTime();
        return bTime - aTime;
      }),
    [threads],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {i18n.t("messages.inbox.title")}
          </Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[400]} />
        </View>
      </SafeAreaView>
    );
  }

  // Show setup screen if tables are missing
  if (tablesMissing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {i18n.t("messages.inbox.title")}
          </Text>
        </View>
        <TablesMissingComponent />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{i18n.t("messages.inbox.title")}</Text>
      </View>

      <FlatList
        data={sortedThreads}
        renderItem={renderMessage}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={ItemSeparator}
        ListEmptyComponent={EmptyComponent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary[400]}
          />
        }
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[800],
  },
  headerTitle: {
    fontSize: typography.sizes["2xl"],
    fontWeight: "700",
    color: colors.gray[50],
  },
  listContent: {
    flexGrow: 1,
  },
  messageCard: {
    backgroundColor: colors.gray[850],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  messageContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    position: "relative",
    marginRight: spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.primary[500],
  },
  avatarText: {
    fontSize: typography.sizes.lg,
    fontWeight: "600",
    color: colors.white,
  },
  unreadBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: colors.primary[500],
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.gray[850],
  },
  unreadCount: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.gray[900],
  },
  messageDetails: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  senderName: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.primary[400],
    flex: 1,
    marginRight: spacing.sm,
  },
  timestamp: {
    fontSize: typography.sizes.sm,
    color: colors.gray[400],
  },
  propertyTitle: {
    fontSize: typography.sizes.sm,
    color: colors.gray[300],
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: typography.sizes.sm,
    color: colors.gray[50],
    lineHeight: 18,
  },
  unreadMessage: {
    fontWeight: "500",
  },
  separator: {
    height: 1,
    backgroundColor: colors.gray[800],
    marginLeft: spacing.lg + 52 + spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl * 3,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: "600",
    color: colors.gray[50],
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.gray[400],
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  setupContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  setupIconContainer: {
    marginBottom: spacing.lg,
  },
  setupTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: "700",
    color: colors.primary[400],
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  setupSubtitle: {
    fontSize: typography.sizes.md,
    color: colors.gray[400],
    textAlign: "center",
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  setupSteps: {
    backgroundColor: colors.gray[850],
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    width: "100%",
  },
  stepHeader: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.gray[50],
    marginBottom: spacing.md,
  },
  step: {
    flexDirection: "row",
    marginBottom: spacing.sm,
  },
  stepNumber: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.primary[400],
    marginRight: spacing.sm,
    width: 20,
  },
  stepText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.gray[300],
    lineHeight: 20,
  },
  setupButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary[500],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  setupButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.gray[900],
  },
  retryButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  retryButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: "500",
    color: colors.gray[400],
    textDecorationLine: "underline",
  },
});
