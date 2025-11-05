import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messageService } from '../services/messageService';
import { useAuthStore } from '../state/useAuthStore';

interface UseChatOptions {
  threadId: string;
  onNewMessage?: (message: any) => void;
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
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser>>(new Map());
  const [isTyping, setIsTyping] = useState(false);
  const [editingMessage, setEditingMessage] = useState<any | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize messageService
  useEffect(() => {
    messageService.initialize().catch(console.error);
  }, []);

  // Fetch thread and messages
  const { data: thread, isLoading, error, refetch } = useQuery({
    queryKey: ['thread', threadId],
    queryFn: async () => {
      const result = await messageService.getThread(threadId);
      if (result?.messages) {
        setMessages(result.messages);
      }
      return result;
    },
    enabled: !!threadId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!enableRealtime || !threadId) return;

    // Handle new messages
    const handleNewMessage = (message: any) => {
      setMessages((prev) => {
        // Check if message already exists (prevent duplicates)
        if (prev.some((m) => m.id === message.id)) {
          return prev.map((m) => (m.id === message.id ? message : m));
        }
        return [...prev, message];
      });

      // Mark as read if needed
      if (autoMarkAsRead && message.sender_id !== user?.id) {
        messageService.markMessagesAsRead(threadId, [message.id]).catch(console.error);
      }

      // Callback
      onNewMessage?.(message);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['threads'] });
      queryClient.invalidateQueries({ queryKey: ['thread', threadId] });
    };

    // Subscribe to thread
    messageService.subscribeToThread(threadId, handleNewMessage);

    // Cleanup
    return () => {
      messageService.unsubscribeFromThread(threadId);
    };
  }, [threadId, enableRealtime, user?.id, onNewMessage, autoMarkAsRead, queryClient]);

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
    mutationFn: async (params: { body: string; attachmentUrls?: string[] }) => {
      return await messageService.sendMessage(threadId, params.body, params.attachmentUrls);
    },
    onSuccess: (message) => {
      if (message) {
        // Optimistically add message
        setMessages((prev) => {
          // Check if message already exists
          if (prev.some((m) => m.id === message.id)) {
            return prev;
          }
          return [...prev, message];
        });

        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['threads'] });
        queryClient.invalidateQueries({ queryKey: ['thread', threadId] });
      }
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
    },
  });

  // Edit message mutation
  const editMessageMutation = useMutation({
    mutationFn: async ({ messageId, body }: { messageId: string; body: string }) => {
      return await messageService.editMessage(messageId, body);
    },
    onSuccess: (message) => {
      if (message) {
        setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
        setEditingMessage(null);
        queryClient.invalidateQueries({ queryKey: ['thread', threadId] });
      }
    },
    onError: (error) => {
      console.error('Failed to edit message:', error);
    },
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      return await messageService.deleteMessage(messageId);
    },
    onSuccess: (_, messageId) => {
      setMessages((prev) => prev.map((m) =>
        m.id === messageId ? { ...m, deleted_at: new Date().toISOString() } : m
      ));
      queryClient.invalidateQueries({ queryKey: ['thread', threadId] });
    },
    onError: (error) => {
      console.error('Failed to delete message:', error);
    },
  });

  // Send message
  const sendMessage = useCallback(
    async (body: string, attachmentUrls?: string[]) => {
      if (!body.trim() && (!attachmentUrls || attachmentUrls.length === 0)) {
        return;
      }

      await sendMessageMutation.mutateAsync({ body, attachmentUrls });
    },
    [sendMessageMutation]
  );

  // Edit message
  const startEditing = useCallback((message: any) => {
    setEditingMessage(message);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingMessage(null);
  }, []);

  const saveEdit = useCallback(
    async (body: string) => {
      if (!editingMessage) return;
      await editMessageMutation.mutateAsync({ messageId: editingMessage.id, body });
    },
    [editingMessage, editMessageMutation]
  );

  // Delete message
  const deleteMsg = useCallback(
    async (messageId: string) => {
      await deleteMessageMutation.mutateAsync(messageId);
    },
    [deleteMessageMutation]
  );

  // Mark messages as read
  const markAsRead = useCallback(
    async (messageIds?: string[]) => {
      const idsToMark = messageIds || messages
        .filter((m) => m.sender_id !== user?.id && !m.read_by?.includes(user?.id))
        .map((m) => m.id);

      if (idsToMark.length > 0) {
        await messageService.markMessagesAsRead(threadId, idsToMark);
        queryClient.invalidateQueries({ queryKey: ['thread', threadId] });
      }
    },
    [threadId, messages, user?.id, queryClient]
  );

  // Typing indicator
  const sendTypingIndicator = useCallback(
    (typing: boolean) => {
      setIsTyping(typing);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      if (typing) {
        // Auto-stop typing after timeout
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
        }, TYPING_TIMEOUT);
      }

      // Note: Typing indicators would need to be implemented in messageService
      // For now, just update local state
      onTypingChange?.(user?.id || '', typing);
    },
    [user?.id, onTypingChange]
  );

  // Check if user can modify message
  const canModifyMessage = useCallback(
    (message: any) => {
      if (!user || !message) return false;
      if (message.sender_id !== user.id) return false;
      if (message.deleted_at) return false;

      // Allow editing within 24 hours
      const messageDate = new Date(message.created_at);
      const now = new Date();
      const hoursDiff = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);

      return hoursDiff < 24;
    },
    [user]
  );

  // Get typing users display
  const typingUsersDisplay = useCallback(() => {
    const typing = Array.from(typingUsers.values());
    if (typing.length === 0) return null;

    const names = typing.map((t) => t.userId); // Should be user names, not IDs
    if (names.length === 1) {
      return `${names[0]} is typing...`;
    } else if (names.length === 2) {
      return `${names.join(' and ')} are typing...`;
    } else {
      return `${names.slice(0, 2).join(', ')} and ${names.length - 2} others are typing...`;
    }
  }, [typingUsers]);

  return {
    // Data
    messages,
    thread,
    isLoading,
    error,
    typingUsers,
    typingUsersDisplay: typingUsersDisplay(),
    isTyping,
    editingMessage,

    // Actions
    sendMessage,
    deleteMessage: deleteMsg,
    startEditing,
    cancelEditing,
    saveEdit,
    markAsRead,
    sendTypingIndicator,
    refetch,

    // Utils
    canModifyMessage,

    // Mutations state
    isSending: sendMessageMutation.isPending,
    isEditing: editMessageMutation.isPending,
    isDeleting: deleteMessageMutation.isPending,
  };
}