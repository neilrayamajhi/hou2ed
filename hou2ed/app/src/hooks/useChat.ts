import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getThreadMessages,
  sendMessage,
  subscribeToThread,
  sendTypingIndicator,
  deleteMessage,
  editMessage,
  type Message,
  type Thread,
  type SendMessageParams,
} from '../services/messaging.service';
import { useAuthStore } from '../state/useAuthStore';

interface UseChatOptions {
  threadId: string;
  onNewMessage?: (message: Message) => void;
  onTypingChange?: (userId: string, isTyping: boolean) => void;
  autoMarkAsRead?: boolean;
  enableRealtime?: boolean;
}

interface TypingUser {
  userId: string;
  timestamp: number;
}

const TYPING_TIMEOUT = 3000; // 3 seconds

export function useChat({
  threadId,
  onNewMessage,
  onTypingChange,
  autoMarkAsRead = true,
  enableRealtime = true,
}: UseChatOptions) {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser>>(new Map());
  const [isTyping, setIsTyping] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  // Refs
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingRef = useRef<number>(0);

  // Fetch messages
  const { data: fetchedMessages, isLoading, error, refetch } = useQuery({
    queryKey: ['messages', threadId],
    queryFn: () => getThreadMessages(threadId),
    enabled: !!threadId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Update local messages when fetched
  useEffect(() => {
    if (fetchedMessages) {
      setMessages(fetchedMessages);
    }
  }, [fetchedMessages]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!enableRealtime || !threadId) return;

    // Handle new messages
    const handleNewMessage = (message: Message) => {
      setMessages((prev) => {
        // Check if message already exists (prevent duplicates)
        if (prev.some((m) => m.id === message.id)) {
          return prev.map((m) => (m.id === message.id ? message : m));
        }
        return [...prev, message];
      });

      // Callback
      onNewMessage?.(message);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['threads'] });
    };

    // Handle typing indicators
    const handleTyping = (userId: string, isTyping: boolean) => {
      if (userId === user?.id) return; // Ignore own typing

      setTypingUsers((prev) => {
        const newMap = new Map(prev);
        if (isTyping) {
          newMap.set(userId, { userId, timestamp: Date.now() });
        } else {
          newMap.delete(userId);
        }
        return newMap;
      });

      onTypingChange?.(userId, isTyping);
    };

    // Subscribe
    unsubscribeRef.current = subscribeToThread(
      threadId,
      handleNewMessage,
      handleTyping
    );

    // Cleanup
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [threadId, enableRealtime, user?.id, onNewMessage, onTypingChange, queryClient]);

  // Clean up stale typing indicators
  useEffect(() => {
    const interval = setInterval(() => {
      setTypingUsers((prev) => {
        const now = Date.now();
        const newMap = new Map(prev);
        let changed = false;

        newMap.forEach((typing, userId) => {
          if (now - typing.timestamp > TYPING_TIMEOUT) {
            newMap.delete(userId);
            changed = true;
          }
        });

        return changed ? newMap : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (params: Omit<SendMessageParams, 'threadId'>) =>
      sendMessage({ ...params, threadId }),
    onSuccess: (result) => {
      if (result.success && result.message) {
        // Optimistically add message
        setMessages((prev) => [...prev, result.message!]);

        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['messages', threadId] });
        queryClient.invalidateQueries({ queryKey: ['threads'] });
      }
    },
    onError: (error) => {
      console.error('Send message error:', error);
    },
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: deleteMessage,
    onSuccess: (result, messageId) => {
      if (result.success) {
        // Remove message from local state
        setMessages((prev) => prev.filter((m) => m.id !== messageId));

        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['messages', threadId] });
      }
    },
  });

  // Edit message mutation
  const editMessageMutation = useMutation({
    mutationFn: ({ messageId, newBody }: { messageId: string; newBody: string }) =>
      editMessage(messageId, newBody),
    onSuccess: (result) => {
      if (result.success && result.message) {
        // Update local message
        setMessages((prev) =>
          prev.map((m) => (m.id === result.message!.id ? result.message! : m))
        );

        // Clear editing state
        setEditingMessage(null);

        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['messages', threadId] });
      }
    },
  });

  // Send a message
  const send = useCallback(
    async (body: string, attachmentUrls?: string[]) => {
      if (!body.trim()) return;

      // Stop typing indicator
      handleStopTyping();

      // Send message
      await sendMessageMutation.mutateAsync({ body: body.trim(), attachmentUrls });
    },
    [sendMessageMutation]
  );

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    const now = Date.now();

    // Only send if not recently sent
    if (now - lastTypingRef.current > 2000) {
      sendTypingIndicator(threadId, true);
      lastTypingRef.current = now;
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, TYPING_TIMEOUT);

    setIsTyping(true);
  }, [threadId]);

  // Stop typing indicator
  const handleStopTyping = useCallback(() => {
    if (isTyping) {
      sendTypingIndicator(threadId, false);
      setIsTyping(false);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [threadId, isTyping]);

  // Start editing a message
  const startEditing = useCallback((message: Message) => {
    if (message.sender_id === user?.id) {
      setEditingMessage(message);
    }
  }, [user?.id]);

  // Cancel editing
  const cancelEditing = useCallback(() => {
    setEditingMessage(null);
  }, []);

  // Save edit
  const saveEdit = useCallback(
    async (newBody: string) => {
      if (!editingMessage) return;

      await editMessageMutation.mutateAsync({
        messageId: editingMessage.id,
        newBody,
      });
    },
    [editingMessage, editMessageMutation]
  );

  // Delete a message
  const remove = useCallback(
    async (messageId: string) => {
      await deleteMessageMutation.mutateAsync(messageId);
    },
    [deleteMessageMutation]
  );

  // Load more messages (pagination)
  const loadMore = useCallback(async () => {
    if (messages.length === 0) return;

    const oldestMessage = messages[0];
    const olderMessages = await getThreadMessages(
      threadId,
      50,
      oldestMessage.created_at
    );

    if (olderMessages.length > 0) {
      setMessages((prev) => [...olderMessages, ...prev]);
    }

    return olderMessages.length > 0;
  }, [threadId, messages]);

  // Retry failed message
  const retry = useCallback(
    async (message: Message) => {
      // Remove failed message from local state
      setMessages((prev) => prev.filter((m) => m.id !== message.id));

      // Resend
      await send(message.body, message.attachment_urls);
    },
    [send]
  );

  // Check if user can edit/delete message
  const canModifyMessage = useCallback(
    (message: Message): boolean => {
      if (!user) return false;

      // User can only modify their own messages
      if (message.sender_id !== user.id) return false;

      // Check if message is recent (within 24 hours)
      const messageAge = Date.now() - new Date(message.created_at).getTime();
      const twentyFourHours = 24 * 60 * 60 * 1000;

      return messageAge < twentyFourHours;
    },
    [user]
  );

  // Get typing users list
  const getTypingUsersList = useCallback((): string[] => {
    return Array.from(typingUsers.keys());
  }, [typingUsers]);

  // Format typing indicator text
  const getTypingText = useCallback((): string => {
    const users = getTypingUsersList();
    if (users.length === 0) return '';
    if (users.length === 1) return `${users[0]} is typing...`;
    if (users.length === 2) return `${users[0]} and ${users[1]} are typing...`;
    return `${users[0]} and ${users.length - 1} others are typing...`;
  }, [getTypingUsersList]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      handleStopTyping();
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  return {
    // Data
    messages,
    isLoading,
    error,
    typingUsers: getTypingUsersList(),
    typingText: getTypingText(),
    editingMessage,

    // Actions
    send,
    remove,
    startEditing,
    cancelEditing,
    saveEdit,
    handleTyping,
    handleStopTyping,
    loadMore,
    retry,
    refetch,

    // Status
    isSending: sendMessageMutation.isPending,
    isEditing: editMessageMutation.isPending,
    isDeleting: deleteMessageMutation.isPending,
    isTyping,

    // Helpers
    canModifyMessage,
  };
}