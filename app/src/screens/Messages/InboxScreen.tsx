import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { RootStackNavigationProp } from "../../navigation/types";
import { colors, spacing, typography, radius } from "../../theme/tokens";

interface Message {
  id: string;
  applicationId: string;
  propertyTitle: string;
  senderName: string;
  senderRole: "provider" | "applicant";
  lastMessage: string;
  timestamp: Date;
  unreadCount: number;
  avatarColor: string;
}

const mockMessages: Message[] = [
  {
    id: "1",
    applicationId: "app-123",
    propertyTitle: "Sunset View Apartments",
    senderName: "John Smith",
    senderRole: "provider",
    lastMessage: "Thank you for your application. We'd like to schedule a viewing...",
    timestamp: new Date(Date.now() - 3600000),
    unreadCount: 2,
    avatarColor: "#FF6B6B",
  },
  {
    id: "2",
    applicationId: "app-124",
    propertyTitle: "Green Valley Homes",
    senderName: "Sarah Johnson",
    senderRole: "provider",
    lastMessage: "Your documents have been received and are under review.",
    timestamp: new Date(Date.now() - 86400000),
    unreadCount: 0,
    avatarColor: "#4ECDC4",
  },
  {
    id: "3",
    applicationId: "app-125",
    propertyTitle: "Downtown Lofts",
    senderName: "Mike Chen",
    senderRole: "provider",
    lastMessage: "Could you please provide additional income verification?",
    timestamp: new Date(Date.now() - 172800000),
    unreadCount: 1,
    avatarColor: "#45B7D1",
  },
  {
    id: "4",
    applicationId: "app-126",
    propertyTitle: "Riverside Commons",
    senderName: "Emily Davis",
    senderRole: "provider",
    lastMessage: "Congratulations! Your application has been approved.",
    timestamp: new Date(Date.now() - 259200000),
    unreadCount: 0,
    avatarColor: "#96CEB4",
  },
  {
    id: "5",
    applicationId: "app-127",
    propertyTitle: "Oak Park Residences",
    senderName: "Robert Wilson",
    senderRole: "provider",
    lastMessage: "We have a few questions about your application.",
    timestamp: new Date(Date.now() - 604800000),
    unreadCount: 0,
    avatarColor: "#FECA57",
  },
];

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
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
    return date.toLocaleDateString("en-US", {
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

  const handleThreadPress = useCallback((message: Message) => {
    navigation.navigate("Thread", {
      messageId: message.id,
      applicationId: message.applicationId,
      propertyTitle: message.propertyTitle,
      senderName: message.senderName,
    });
  }, [navigation]);

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    return (
      <TouchableOpacity
        style={styles.messageCard}
        onPress={() => handleThreadPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.messageContent}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { backgroundColor: item.avatarColor }]}>
              <Text style={styles.avatarText}>{getInitials(item.senderName)}</Text>
            </View>
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>{item.unreadCount}</Text>
              </View>
            )}
          </View>

          <View style={styles.messageDetails}>
            <View style={styles.messageHeader}>
              <Text style={styles.senderName} numberOfLines={1}>
                {item.senderName}
              </Text>
              <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
            </View>
            <Text style={styles.propertyTitle} numberOfLines={1}>
              {item.propertyTitle}
            </Text>
            <Text
              style={[
                styles.lastMessage,
                item.unreadCount > 0 && styles.unreadMessage
              ]}
              numberOfLines={2}
            >
              {item.lastMessage}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [handleThreadPress]);

  const keyExtractor = useCallback((item: Message) => item.id, []);

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

  const sortedMessages = useMemo(() =>
    [...mockMessages].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
    []
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      <FlatList
        data={sortedMessages}
        renderItem={renderMessage}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={ItemSeparator}
        ListEmptyComponent={EmptyComponent}
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
});