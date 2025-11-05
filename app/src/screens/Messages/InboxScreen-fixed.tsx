import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography, radius } from "../../theme/tokens";
import { RootStackNavigationProp } from "../../navigation/types";
import { messageService, ThreadWithDetails } from "../../services/messageService";
import { useAuthStore } from "../../state/useAuthStore";

interface MessageTime {
  time: string;
  label: string;
}

function formatMessageTime(date: Date | string): MessageTime {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - dateObj.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) {
    return { time: "now", label: "Just now" };
  } else if (minutes < 60) {
    return { time: `${minutes}m`, label: `${minutes} minutes ago` };
  } else if (hours < 24) {
    return { time: `${hours}h`, label: `${hours} hours ago` };
  } else if (days < 7) {
    return { time: `${days}d`, label: `${days} days ago` };
  } else {
    return {
      time: dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      label: dateObj.toLocaleDateString("en-US", { month: "long", day: "numeric" })
    };
  }
}

export default function InboxScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { user } = useAuthStore(); // Get user from auth store
  const [threads, setThreads] = useState<ThreadWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [tablesMissing, setTablesMissing] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null);

  // Initialize and fetch threads
  const loadThreads = useCallback(async () => {
    try {
      // Initialize message service only if not already initialized
      if (!initialized) {
        const userId = await messageService.initialize();
        setCurrentUserId(userId);
        setInitialized(true);
      }

      // Fetch threads
      const fetchedThreads = await messageService.getThreads();
      setThreads(fetchedThreads);
      setTablesMissing(false);
    } catch (error) {
      console.error('Error loading threads:', error);
      // Check if this is a missing table error
      if (error?.message?.includes('table') || error?.code === 'PGRST205') {
        setTablesMissing(true);
      } else if (error?.message?.includes('Authentication required') || error?.message?.includes('User not authenticated')) {
        // User not logged in
        console.log('User not authenticated, cannot load messages');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [initialized]);

  // Initial load
  useEffect(() => {
    if (user) {
      loadThreads();
    } else {
      setLoading(false);
      console.log('No user logged in');
    }
  }, [user]);

  // Subscribe to inbox updates after initialization
  useEffect(() => {
    if (initialized && currentUserId) {
      try {
        const unsub = messageService.subscribeToInbox(() => {
          // Reload threads when there's an update
          loadThreads();
        });
        setUnsubscribe(() => unsub);

        return () => {
          if (unsub) {
            unsub();
          }
        };
      } catch (error) {
        console.error('Failed to subscribe to inbox:', error);
      }
    }
  }, [initialized, currentUserId, loadThreads]);

  // Load threads when screen focuses
  useFocusEffect(
    useCallback(() => {
      if (initialized) {
        loadThreads();
      }
    }, [initialized, loadThreads])
  );

  // Handle pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadThreads();
  }, [loadThreads]);

  const handleThreadPress = useCallback((thread: ThreadWithDetails) => {
    // Mark messages as read when opening thread
    if (currentUserId) {
      messageService.markMessagesAsRead(thread.id).catch(console.error);
    }

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
            <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
              <Text style={styles.avatarText}>
                {otherParticipant.full_name?.charAt(0).toUpperCase() || "?"}
              </Text>
            </View>
            {item.unread_count > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>
                  {item.unread_count > 99 ? "99+" : item.unread_count}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.messageDetails}>
            <View style={styles.messageHeader}>
              <Text style={styles.senderName} numberOfLines={1}>
                {otherParticipant.full_name || "Unknown User"}
              </Text>
              <Text style={styles.messageTime}>
                {formatMessageTime(item.last_message_at || item.created_at).time}
              </Text>
            </View>

            <Text style={styles.messageSubject} numberOfLines={1}>
              {item.subject || item.listing_id ? "Property Inquiry" : "Direct Message"}
            </Text>

            {item.messages && item.messages.length > 0 && (
              <Text style={styles.messagePreview} numberOfLines={2}>
                {item.messages[0].body}
              </Text>
            )}
          </View>
        </View>

        <Ionicons
          name="chevron-forward"
          size={20}
          color={colors.gray[600]}
          style={styles.chevron}
        />
      </TouchableOpacity>
    );
  }, [currentUserId, handleThreadPress]);

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="mail-outline" size={64} color={colors.gray[600]} />
          <Text style={styles.emptyTitle}>Sign In Required</Text>
          <Text style={styles.emptyText}>
            Please sign in to view your messages
          </Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => navigation.navigate('Auth', { screen: 'SignIn' })}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Show loading spinner
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[400]} />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show table missing error
  if (tablesMissing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.error[400]} />
          <Text style={styles.emptyTitle}>Database Setup Required</Text>
          <Text style={styles.emptyText}>
            The messaging tables need to be set up.{"\n"}
            Please contact support or run the database migration.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show empty state
  if (threads.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="mail-outline" size={64} color={colors.gray[600]} />
          <Text style={styles.emptyTitle}>No Messages Yet</Text>
          <Text style={styles.emptyText}>
            Your conversations will appear here
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show messages list
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      <FlatList
        data={threads}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary[400]]}
            tintColor={colors.primary[400]}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[800],
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: "700",
    color: colors.primary[400],
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  messageCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  messageContent: {
    flex: 1,
    flexDirection: "row",
  },
  avatarContainer: {
    marginRight: spacing.sm,
    position: "relative",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: typography.sizes.lg,
    fontWeight: "600",
    color: colors.white,
  },
  unreadBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: colors.error[400],
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.background,
  },
  unreadCount: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.white,
  },
  messageDetails: {
    flex: 1,
    justifyContent: "center",
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
    color: colors.text.primary,
    flex: 1,
    marginRight: spacing.xs,
  },
  messageTime: {
    fontSize: typography.sizes.xs,
    color: colors.gray[500],
  },
  messageSubject: {
    fontSize: typography.sizes.sm,
    color: colors.primary[400],
    marginBottom: 2,
  },
  messagePreview: {
    fontSize: typography.sizes.sm,
    color: colors.gray[400],
    lineHeight: 18,
  },
  chevron: {
    marginLeft: spacing.xs,
  },
  separator: {
    height: 1,
    backgroundColor: colors.gray[900],
    marginLeft: spacing.md + 48 + spacing.sm, // Align with message content
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: "600",
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    color: colors.gray[500],
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: typography.sizes.sm,
    color: colors.gray[500],
    marginTop: spacing.md,
  },
  signInButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary[400],
    borderRadius: radius.md,
  },
  signInButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.black,
  },
});