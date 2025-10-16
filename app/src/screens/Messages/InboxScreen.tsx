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
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { RootStackNavigationProp } from "../../navigation/types";
import { colors, spacing, typography, radius } from "../../theme/tokens";
import { messageService, ThreadWithDetails } from "../../services/messageService";
import { supabase } from "../../lib/supabase";

function formatTimestamp(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
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
      day: "numeric"
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
  const [threads, setThreads] = useState<ThreadWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Initialize and fetch threads
  const loadThreads = useCallback(async () => {
    try {
      // Initialize message service
      const userId = await messageService.initialize();
      setCurrentUserId(userId);

      // Fetch threads
      const fetchedThreads = await messageService.getThreads();
      setThreads(fetchedThreads);
    } catch (error) {
      console.error('Error loading threads:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Load threads on mount and when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadThreads();

      // Subscribe to inbox updates
      const unsubscribe = messageService.subscribeToInbox(() => {
        // Reload threads when there's an update
        loadThreads();
      });

      return () => {
        unsubscribe();
      };
    }, [loadThreads])
  );

  // Handle pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadThreads();
  }, [loadThreads]);

  const handleThreadPress = useCallback((thread: ThreadWithDetails) => {
    // Mark messages as read when opening thread
    messageService.markMessagesAsRead(thread.id);

    // Get other participant for display
    const otherParticipant = thread.participants?.find(
      p => p.id !== currentUserId
    );

    navigation.navigate("Thread", {
      threadId: thread.id,
      messageId: thread.id, // For backward compatibility
      applicationId: thread.application_id || '',
      propertyTitle: thread.subject || 'Conversation',
      senderName: otherParticipant?.full_name || 'User',
      participantId: otherParticipant?.id || '',
    });
  }, [navigation, currentUserId]);

  const renderMessage = useCallback(({ item }: { item: ThreadWithDetails }) => {
    // Get other participant (not the current user)
    const otherParticipant = item.participants?.find(
      p => p.id !== currentUserId
    );

    if (!otherParticipant) return null;

    const avatarColors = [
      "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FECA57",
      "#48C9B0", "#9B59B6", "#E74C3C", "#3498DB", "#F39C12"
    ];

    // Generate consistent color based on user ID
    const colorIndex = otherParticipant.id.charCodeAt(0) % avatarColors.length;
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
                {item.last_message_at ? formatTimestamp(item.last_message_at) : ''}
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
                item.unreadCount > 0 && styles.unreadMessage
              ]}
              numberOfLines={2}
            >
              {item.lastMessage?.body || 'Start a conversation...'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [handleThreadPress, currentUserId]);

  const keyExtractor = useCallback((item: ThreadWithDetails) => item.id, []);

  const ItemSeparator = useCallback(() => (
    <View style={styles.separator} />
  ), []);

  const EmptyComponent = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={64} color={colors.gray[400]} />
      <Text style={styles.emptyTitle}>No Messages Yet</Text>
      <Text style={styles.emptySubtitle}>
        Your conversations with housing providers will appear here
      </Text>
    </View>
  ), []);

  const sortedThreads = useMemo(() =>
    [...threads].sort((a, b) => {
      const aTime = new Date(a.last_message_at || 0).getTime();
      const bTime = new Date(b.last_message_at || 0).getTime();
      return bTime - aTime;
    }),
    [threads]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[400]} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
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
});