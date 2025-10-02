import React, { useState, useRef, useCallback, useMemo } from "react";
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
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { RootStackNavigationProp, RootStackRouteProp } from "../../navigation/types";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { colors, spacing, typography, radius } from "../../theme/tokens";

interface ChatMessage {
  id: string;
  text: string;
  sender: "user" | "provider";
  timestamp: Date;
  isRead: boolean;
  attachments?: Attachment[];
}

interface Attachment {
  id: string;
  name: string;
  type: "image" | "document";
  uri: string;
  size: number;
}

const mockMessages: ChatMessage[] = [
  {
    id: "1",
    text: "Thank you for your application to Sunset View Apartments. We'd like to schedule a viewing with you.",
    sender: "provider",
    timestamp: new Date(Date.now() - 7200000),
    isRead: true,
  },
  {
    id: "2",
    text: "That sounds great! I'm available most weekdays after 3 PM and anytime on weekends.",
    sender: "user",
    timestamp: new Date(Date.now() - 6000000),
    isRead: true,
  },
  {
    id: "3",
    text: "Perfect! How about this Saturday at 2 PM? The address is 123 Main St.",
    sender: "provider",
    timestamp: new Date(Date.now() - 4800000),
    isRead: true,
  },
  {
    id: "4",
    text: "Saturday at 2 PM works for me. Should I bring any documents?",
    sender: "user",
    timestamp: new Date(Date.now() - 3600000),
    isRead: true,
  },
  {
    id: "5",
    text: "Please bring a valid ID and proof of income if you have it handy. Looking forward to meeting you!",
    sender: "provider",
    timestamp: new Date(Date.now() - 1800000),
    isRead: true,
    attachments: [
      {
        id: "att-1",
        name: "viewing_checklist.pdf",
        type: "document",
        uri: "https://example.com/doc.pdf",
        size: 245000,
      },
    ],
  },
];

function formatMessageTime(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  return date.toLocaleDateString("en-US", {
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

  const [messages, setMessages] = useState(mockMessages);
  const [inputText, setInputText] = useState("");
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportText, setReportText] = useState("");
  const [selectedAttachments, setSelectedAttachments] = useState<Attachment[]>([]);

  const { propertyTitle, senderName } = route.params || {};

  const handleSend = useCallback(() => {
    if (!inputText.trim() && selectedAttachments.length === 0) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: "user",
      timestamp: new Date(),
      isRead: false,
      attachments: selectedAttachments.length > 0 ? selectedAttachments : undefined,
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputText("");
    setSelectedAttachments([]);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [inputText, selectedAttachments]);

  const handleAttachmentPress = useCallback(async () => {
    Alert.alert(
      "Add Attachment",
      "Choose an option",
      [
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
              setSelectedAttachments((prev) => [...prev, {
                id: Date.now().toString(),
                name: `image_${Date.now()}.jpg`,
                type: "image",
                uri: asset.uri,
                size: 1000000,
              }]);
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
              setSelectedAttachments((prev) => [...prev, {
                id: Date.now().toString(),
                name: doc.name,
                type: "document",
                uri: doc.uri,
                size: doc.size || 0,
              }]);
            }
          },
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  }, []);

  const handleAttachmentLongPress = useCallback((attachment: Attachment) => {
    Alert.alert(
      attachment.name,
      `Size: ${formatFileSize(attachment.size)}`,
      [
        {
          text: "Open",
          onPress: () => {
            Alert.alert("Opening", `Would open ${attachment.name}`);
          },
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  }, []);

  const handleReportAbuse = useCallback(() => {
    setReportModalVisible(true);
  }, []);

  const submitReport = useCallback(() => {
    if (!reportText.trim()) return;

    Alert.alert(
      "Report Sent",
      "Your report has been sent to our moderation team. We'll review it within 24 hours.",
      [{ text: "OK" }]
    );

    setReportModalVisible(false);
    setReportText("");
  }, [reportText]);

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
    const isUser = item.sender === "user";

    return (
      <View style={[styles.messageRow, isUser && styles.userMessageRow]}>
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.providerBubble]}>
          {item.text ? (
            <Text style={[styles.messageText, isUser && styles.userMessageText]}>
              {item.text}
            </Text>
          ) : null}

          {item.attachments?.map((attachment) => (
            <TouchableOpacity
              key={attachment.id}
              style={styles.attachmentChip}
              onLongPress={() => handleAttachmentLongPress(attachment)}
              delayLongPress={500}
            >
              <Ionicons
                name={attachment.type === "image" ? "image-outline" : "document-outline"}
                size={16}
                color={isUser ? colors.gray[900] : colors.gray[50]}
              />
              <Text
                style={[styles.attachmentName, isUser && styles.userAttachmentName]}
                numberOfLines={1}
              >
                {attachment.name}
              </Text>
              <Text style={[styles.attachmentSize, isUser && styles.userAttachmentSize]}>
                {formatFileSize(attachment.size)}
              </Text>
            </TouchableOpacity>
          ))}

          <View style={styles.messageFooter}>
            <Text style={[styles.timestamp, isUser && styles.userTimestamp]}>
              {formatMessageTime(item.timestamp)}
            </Text>
            {isUser && item.isRead && (
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
  }, [handleAttachmentLongPress]);

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  const sortedMessages = useMemo(() =>
    [...messages].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
    [messages]
  );

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
          <Text style={styles.senderName} numberOfLines={1}>{senderName}</Text>
          <Text style={styles.propertyTitle} numberOfLines={1}>{propertyTitle}</Text>
        </View>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={handleReportAbuse}
        >
          <Ionicons name="ellipsis-vertical" size={20} color={colors.gray[50]} />
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
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
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
                  onPress={() => setSelectedAttachments((prev) =>
                    prev.filter((a) => a.id !== att.id)
                  )}
                >
                  <Ionicons name="close-circle" size={16} color={colors.gray[400]} />
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
          />

          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() && selectedAttachments.length === 0) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() && selectedAttachments.length === 0}
          >
            <Ionicons
              name="send"
              size={20}
              color={(!inputText.trim() && selectedAttachments.length === 0) ? colors.gray[600] : colors.primary[400]}
            />
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
          <Pressable style={styles.reportModal} onPress={(e) => e.stopPropagation()}>
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
  attachmentSize: {
    fontSize: typography.sizes.xs,
    color: colors.gray[600],
    marginLeft: spacing.xs,
  },
  userAttachmentSize: {
    color: colors.gray[700],
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
});