import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Modal,
  Alert,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  RootStackNavigationProp,
  RootStackRouteProp,
} from "../../navigation/types";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { colors, spacing, typography, radius } from "../../theme/tokens";
import {
  messageService,
  MessageWithSender,
  ThreadWithDetails,
} from "../../services/messageService";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../state/useAuthStore";

interface Attachment {
  id: string;
  name: string;
  type: "image" | "document";
  uri: string;
  size: number;
}

function formatMessageTime(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const isToday = dateObj.toDateString() === now.toDateString();

  if (isToday) {
    return dateObj.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  return dateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

export default function ThreadScreen() {
  const route = useRoute<RootStackRouteProp<"Thread">>();
  const navigation = useNavigation<RootStackNavigationProp>();
  const flatListRef = useRef<FlatList>(null);

  const [thread, setThread] = useState<ThreadWithDetails | null>(null);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [inputText, setInputText] = useState("");
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportText, setReportText] = useState("");
  const [selectedAttachments, setSelectedAttachments] = useState<Attachment[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const { threadId, participantId, propertyTitle, senderName } =
    route.params || {};

  const storeUserId = useAuthStore((s) => s.user?.id);

  // Initialize and load thread
  useEffect(() => {
    async function loadThread() {
      try {
        // Initialize message service with current auth user if available
        const userId = await messageService.initialize(storeUserId || undefined);
        console.log("[ThreadScreen] Initialized with userId:", userId);
        setCurrentUserId(userId);

        if (!userId) {
          console.error("[ThreadScreen] No user ID after initialization");
          Alert.alert("Error", "You must be logged in to access messages.");
          return;
        }

        // If we have a threadId, load the thread
        if (threadId) {
          console.log("[ThreadScreen] Loading existing thread:", threadId);
          const threadData = await messageService.getThread(threadId);
          if (threadData) {
            console.log("[ThreadScreen] Thread loaded:", threadData.id);
            setThread(threadData);
            // Normalize legacy messages that may use `content` instead of `body`
            const normalized = (threadData.messages || []).map((m: any) => ({
              ...m,
              body: m?.body ?? m?.content ?? "",
              content: m?.content ?? m?.body ?? "",
            }));
            setMessages(normalized);
          } else {
            console.error("[ThreadScreen] Failed to load thread:", threadId);
            Alert.alert(
              "Error",
              "Failed to load conversation. Please try again.",
            );
          }
        } else if (participantId && userId) {
          // Create a new thread if needed
          console.log(
            "[ThreadScreen] Creating new thread with participant:",
            participantId,
          );
          const newThread = await messageService.createThread(
            [userId, participantId],
            propertyTitle || "New Conversation",
          );
          if (newThread) {
            console.log("[ThreadScreen] Thread created:", newThread.id);
            setThread({ ...newThread, messages: [], participants: [] });
            setMessages([]);
          } else {
            console.error("[ThreadScreen] Failed to create thread");
            Alert.alert(
              "Error",
              "Failed to create conversation. Please ensure messaging tables exist in the database.",
            );
          }
        }

        // Mark messages as read
        if (threadId) {
          await messageService.markMessagesAsRead(threadId);
        }
      } catch (error) {
        console.error("[ThreadScreen] Error loading thread:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        Alert.alert("Error", `Failed to load conversation: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    }

    loadThread();
  }, [threadId, participantId, propertyTitle, storeUserId]);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!threadId) return;

    const unsubscribe = messageService.subscribeToThread(
      threadId,
      (newMessage: MessageWithSender) => {
        setMessages((prev) => {
          // Check if message already exists (update) or is new
          const existingIndex = prev.findIndex((m) => m.id === newMessage.id);
          if (existingIndex >= 0) {
            // Update existing message
            const updated = [...prev];
            updated[existingIndex] = newMessage;
            return updated;
          } else {
            // Add new message
            return [...prev, newMessage];
          }
        });

        // Mark as read if from other user
        if (newMessage.sender_id !== currentUserId) {
          messageService.markMessagesAsRead(threadId);
        }

        // Scroll to bottom on new message
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [threadId, currentUserId]);

  const handleSend = useCallback(async () => {
    if (!inputText.trim() && selectedAttachments.length === 0) return;

    // Validate thread exists
    if (!thread?.id) {
      console.error("[ThreadScreen] Cannot send: thread.id is undefined", {
        thread,
      });
      Alert.alert(
        "Error",
        "Unable to send message. Thread not initialized. Please try reopening the conversation.",
      );
      return;
    }

    // Validate user is authenticated
    if (!currentUserId) {
      console.error("[ThreadScreen] Cannot send: currentUserId is undefined");
      Alert.alert("Error", "You must be logged in to send messages.");
      return;
    }

    setSending(true);
    try {
      // Upload attachments if any (in a real app)
      const attachmentUrls =
        selectedAttachments.length > 0
          ? selectedAttachments.map((a) => a.uri)
          : undefined;

      // Log attempt for debugging
      console.log("[ThreadScreen] Sending message:", {
        threadId: thread.id,
        senderId: currentUserId,
        bodyLength: inputText.trim().length,
        hasAttachments: !!attachmentUrls,
      });

      // Optimistically add message to UI
      const tempId = `temp-${Date.now()}`;
      const optimistic = {
        id: tempId,
        thread_id: thread.id,
        sender_id: currentUserId,
        body: inputText.trim(),
        attachment_urls: attachmentUrls || [],
        read_by: [currentUserId],
        deleted_at: null,
        edited_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sender: undefined as any,
      } as MessageWithSender;
      setMessages((prev) => [...prev, optimistic]);

      // Send message
      const sentMessage = await messageService.sendMessage(
        thread.id,
        inputText.trim(),
        attachmentUrls,
      );

      if (sentMessage) {
        // Clear input
        setInputText("");
        setSelectedAttachments([]);
        console.log(
          "[ThreadScreen] Message sent successfully:",
          sentMessage.id,
        );

        // Replace optimistic message with server message (or leave if realtime updates it)
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === tempId);
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = sentMessage as any;
          return next;
        });
      } else {
        console.error("[ThreadScreen] sendMessage returned null");
        Alert.alert(
          "Error",
          "Failed to send message. This may be a database issue. Please check that messaging tables exist.",
        );
        // Rollback optimistic
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    } catch (error) {
      console.error("[ThreadScreen] Error sending message:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      Alert.alert("Error", `Failed to send message: ${errorMessage}`);
      // Rollback optimistic
      setMessages((prev) => prev.filter((m) => !m.id?.toString().startsWith('temp-')));
    } finally {
      setSending(false);
    }
  }, [inputText, selectedAttachments, thread, currentUserId]);

  const handleAttachmentPress = useCallback(async () => {
    Alert.alert("Add Attachment", "Choose an option", [
      {
        text: "Photo Library",
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: false,
            quality: 0.8,
          });

          if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            setSelectedAttachments((prev) => [
              ...prev,
              {
                id: Date.now().toString(),
                name: `image_${Date.now()}.jpg`,
                type: "image",
                uri: asset.uri,
                size: 1000000,
              },
            ]);
          }
        },
      },
      {
        text: "Document",
        onPress: async () => {
          const result = await DocumentPicker.getDocumentAsync({
            type: ["application/pdf", "image/*"],
            copyToCacheDirectory: true,
          });

          if (!result.canceled && result.assets[0]) {
            const doc = result.assets[0];
            setSelectedAttachments((prev) => [
              ...prev,
              {
                id: Date.now().toString(),
                name: doc.name,
                type: "document",
                uri: doc.uri,
                size: doc.size || 0,
              },
            ]);
          }
        },
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
  }, []);

  const handleAttachmentLongPress = useCallback((attachmentUrl: string) => {
    Alert.alert("Attachment", "What would you like to do?", [
      {
        text: "Open",
        onPress: () => {
          Alert.alert("Opening", `Would open attachment`);
        },
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
  }, []);

  const handleReportAbuse = useCallback(() => {
    setReportModalVisible(true);
  }, []);

  const submitReport = useCallback(() => {
    if (!reportText.trim()) return;

    Alert.alert(
      "Report Sent",
      "Your report has been sent to our moderation team. We'll review it within 24 hours.",
      [{ text: "OK" }],
    );

    setReportModalVisible(false);
    setReportText("");
  }, [reportText]);

  const renderMessage = useCallback(
    ({ item }: { item: MessageWithSender }) => {
      const isUser = item.sender_id === currentUserId;

      // Skip deleted messages
      if (item.deleted_at) {
        return (
          <View style={[styles.messageRow, isUser && styles.userMessageRow]}>
            <View style={styles.deletedMessage}>
              <Text style={styles.deletedMessageText}>Message deleted</Text>
            </View>
          </View>
        );
      }

      return (
        <View style={[styles.messageRow, isUser && styles.userMessageRow]}>
          <View
            style={[
              styles.messageBubble,
              isUser ? styles.userBubble : styles.providerBubble,
            ]}
          >
            {(item.body || (item as any).content) ? (
              <Text
                style={[styles.messageText, isUser && styles.userMessageText]}
              >
                {item.body || (item as any).content}
              </Text>
            ) : null}

            {item.attachment_urls?.map((url, index) => (
              <TouchableOpacity
                key={`${item.id}-attachment-${index}`}
                style={styles.attachmentChip}
                onLongPress={() => handleAttachmentLongPress(url)}
                delayLongPress={500}
              >
                <Ionicons
                  name="document-outline"
                  size={16}
                  color={isUser ? colors.gray[900] : colors.gray[50]}
                />
                <Text
                  style={[
                    styles.attachmentName,
                    isUser && styles.userAttachmentName,
                  ]}
                  numberOfLines={1}
                >
                  Attachment {index + 1}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={styles.messageFooter}>
              <Text style={[styles.timestamp, isUser && styles.userTimestamp]}>
                {formatMessageTime(item.created_at)}
                {item.edited_at && " (edited)"}
              </Text>
              {isUser && item.read_by && item.read_by.length > 1 && (
                <Ionicons
                  name="checkmark-done"
                  size={14}
                  color={colors.gray[700]}
                  style={styles.readReceipt}
                />
              )}
            </View>
          </View>
        </View>
      );
    },
    [currentUserId, handleAttachmentLongPress],
  );

  const keyExtractor = useCallback((item: MessageWithSender) => item.id, []);

  const sortedMessages = useMemo(
    () =>
      [...messages].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      ),
    [messages],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.gray[50]} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.senderName}>{senderName || "Loading..."}</Text>
          </View>
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.gray[50]} />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.senderName} numberOfLines={1}>
            {senderName}
          </Text>
          <Text style={styles.propertyTitle} numberOfLines={1}>
            {propertyTitle}
          </Text>
        </View>

        <TouchableOpacity style={styles.menuButton} onPress={handleReportAbuse}>
          <Ionicons
            name="ellipsis-vertical"
            size={20}
            color={colors.gray[50]}
          />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={sortedMessages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatText}>
                Start a conversation about {propertyTitle || "this listing"}
              </Text>
            </View>
          }
        />

        {selectedAttachments.length > 0 && (
          <View style={styles.attachmentPreview}>
            {selectedAttachments.map((att) => (
              <View key={att.id} style={styles.previewChip}>
                <Ionicons
                  name={att.type === "image" ? "image" : "document"}
                  size={14}
                  color={colors.primary[400]}
                />
                <Text style={styles.previewName} numberOfLines={1}>
                  {att.name}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setSelectedAttachments((prev) =>
                      prev.filter((a) => a.id !== att.id),
                    )
                  }
                >
                  <Ionicons
                    name="close-circle"
                    size={16}
                    color={colors.gray[400]}
                  />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={handleAttachmentPress}
          >
            <Ionicons name="attach" size={24} color={colors.gray[400]} />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor={colors.gray[500]}
            multiline
            editable={!sending}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              !inputText.trim() &&
                selectedAttachments.length === 0 &&
                styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={
              (!inputText.trim() && selectedAttachments.length === 0) ||
              sending ||
              !thread?.id ||
              !currentUserId ||
              loading
            }
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.primary[400]} />
            ) : (
              <Ionicons
                name="send"
                size={20}
                color={
                  (!inputText.trim() && selectedAttachments.length === 0) ||
                  !thread?.id ||
                  !currentUserId ||
                  loading
                    ? colors.gray[600]
                    : colors.primary[400]
                }
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={reportModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setReportModalVisible(false)}
        >
          <Pressable
            style={styles.reportModal}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.reportTitle}>Report Abuse</Text>
            <Text style={styles.reportSubtitle}>
              Please describe the issue you're experiencing
            </Text>

            <TextInput
              style={styles.reportInput}
              value={reportText}
              onChangeText={setReportText}
              placeholder="Describe the inappropriate behavior..."
              placeholderTextColor={colors.gray[500]}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.reportButtons}>
              <TouchableOpacity
                style={[styles.reportButton, styles.cancelButton]}
                onPress={() => setReportModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.reportButton, styles.submitButton]}
                onPress={submitReport}
              >
                <Text style={styles.submitButtonText}>Submit Report</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[800],
  },
  backButton: {
    padding: spacing.xs,
  },
  headerInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  senderName: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.primary[400],
  },
  propertyTitle: {
    fontSize: typography.sizes.sm,
    color: colors.gray[400],
    marginTop: 2,
  },
  menuButton: {
    padding: spacing.xs,
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    paddingVertical: spacing.md,
  },
  messageRow: {
    paddingHorizontal: spacing.md,
    marginVertical: spacing.xs,
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  userMessageRow: {
    justifyContent: "flex-end",
  },
  messageBubble: {
    maxWidth: "75%",
    padding: spacing.sm,
    borderRadius: radius.lg,
  },
  userBubble: {
    backgroundColor: colors.primary[500],
  },
  providerBubble: {
    backgroundColor: colors.gray[100],
  },
  messageText: {
    fontSize: typography.sizes.sm,
    color: colors.gray[900],
    lineHeight: 20,
  },
  userMessageText: {
    color: colors.gray[900],
  },
  deletedMessage: {
    padding: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.gray[800],
  },
  deletedMessageText: {
    fontSize: typography.sizes.sm,
    color: colors.gray[500],
    fontStyle: "italic",
  },
  attachmentChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderRadius: radius.md,
    padding: spacing.xs,
    marginTop: spacing.xs,
  },
  attachmentName: {
    fontSize: typography.sizes.sm,
    color: colors.gray[900],
    marginLeft: spacing.xs,
    flex: 1,
  },
  userAttachmentName: {
    color: colors.gray[900],
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xs,
  },
  timestamp: {
    fontSize: typography.sizes.xs,
    color: colors.gray[600],
  },
  userTimestamp: {
    color: colors.gray[700],
  },
  readReceipt: {
    marginLeft: spacing.xs,
  },
  attachmentPreview: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.gray[800],
  },
  previewChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.gray[800],
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  previewName: {
    fontSize: typography.sizes.xs,
    color: colors.gray[200],
    marginHorizontal: spacing.xs,
    maxWidth: 100,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray[800],
  },
  attachButton: {
    padding: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.gray[800],
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.sm,
    fontSize: typography.sizes.sm,
    color: colors.gray[50],
    maxHeight: 100,
  },
  sendButton: {
    padding: spacing.sm,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  reportModal: {
    width: "90%",
    backgroundColor: colors.gray[800],
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  reportTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: "600",
    color: colors.gray[50],
    marginBottom: spacing.xs,
  },
  reportSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.gray[400],
    marginBottom: spacing.lg,
  },
  reportInput: {
    backgroundColor: colors.gray[900],
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: typography.sizes.sm,
    color: colors.gray[50],
    minHeight: 100,
    marginBottom: spacing.lg,
  },
  reportButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  reportButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    marginLeft: spacing.sm,
  },
  cancelButton: {
    backgroundColor: colors.gray[700],
  },
  cancelButtonText: {
    fontSize: typography.sizes.sm,
    color: colors.gray[200],
  },
  submitButton: {
    backgroundColor: colors.primary[500],
  },
  submitButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.gray[900],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyChat: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  emptyChatText: {
    fontSize: typography.sizes.sm,
    color: colors.gray[500],
    textAlign: "center",
  },
});
