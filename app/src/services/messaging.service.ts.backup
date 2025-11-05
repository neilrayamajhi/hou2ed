import { supabase } from '../lib/supabase';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Type definitions
export interface Thread {
  id: string;
  listing_id: string;
  application_id?: string;
  participants: string[];
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  attachment_urls?: string[];
  read_at?: string;
  edited_at?: string;
  deleted_at?: string;
  created_at: string;
}

export interface SendMessageParams {
  threadId: string;
  body: string;
  attachmentUrls?: string[];
}

export interface CreateThreadParams {
  listingId: string;
  applicationId?: string;
  participantId: string;
}

export interface MessageResult {
  success: boolean;
  message?: Message;
  error?: string;
}

export interface ThreadResult {
  success: boolean;
  thread?: Thread;
  error?: string;
}

// Cache for active subscriptions
const activeSubscriptions = new Map<string, RealtimeChannel>();

/**
 * Create or get existing thread
 */
export async function createOrGetThread(
  params: CreateThreadParams
): Promise<ThreadResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    // Check if thread already exists
    const { data: existingThread } = await supabase
      .from('threads')
      .select('*')
      .eq('listing_id', params.listingId)
      .contains('participants', [user.id, params.participantId])
      .single();

    if (existingThread) {
      return {
        success: true,
        thread: existingThread as Thread,
      };
    }

    // Create new thread
    const { data: newThread, error } = await supabase
      .from('threads')
      .insert({
        listing_id: params.listingId,
        application_id: params.applicationId,
        participants: [user.id, params.participantId],
      })
      .select()
      .single();

    if (error) {
      console.error('Create thread error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      thread: newThread as Thread,
    };
  } catch (error) {
    console.error('Create thread error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create thread',
    };
  }
}

/**
 * Send a message in a thread
 */
export async function sendMessage(
  params: SendMessageParams
): Promise<MessageResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    // Validate thread access
    const hasAccess = await validateThreadAccess(params.threadId, user.id);
    if (!hasAccess) {
      return {
        success: false,
        error: 'Access denied to this thread',
      };
    }

    // Insert message
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        thread_id: params.threadId,
        sender_id: user.id,
        body: params.body,
        attachment_urls: params.attachmentUrls,
      })
      .select()
      .single();

    if (error) {
      console.error('Send message error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    // Update thread's last message
    await updateThreadLastMessage(params.threadId, params.body);

    return {
      success: true,
      message: message as Message,
    };
  } catch (error) {
    console.error('Send message error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send message',
    };
  }
}

/**
 * Get thread messages with pagination
 */
export async function getThreadMessages(
  threadId: string,
  limit: number = 50,
  before?: string
): Promise<Message[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Validate access
    const hasAccess = await validateThreadAccess(threadId, user.id);
    if (!hasAccess) return [];

    let query = supabase
      .from('messages')
      .select('*')
      .eq('thread_id', threadId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {1
      query = query.lt('created_at', before);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Get messages error:', error);
      return [];
    }

    // Mark messages as read
    await markMessagesAsRead(threadId, user.id);

    return (data as Message[]).reverse(); // Return in chronological order
  } catch (error) {
    console.error('Get messages error:', error);
    return [];
  }
}

/**
 * Get user's threads
 */
export async function getUserThreads(): Promise<Thread[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('threads')
      .select(`
        *,
        messages (
          body,
          created_at,
          sender_id
        ),
        listings (
          title,
          images
        )
      `)
      .contains('participants', [user.id])
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Get threads error:', error);
      return [];
    }

    // Process threads to add last message and unread count
    const processedThreads = await Promise.all(
      (data as any[]).map(async (thread) => {
        const lastMessage = thread.messages?.[0];
        const unreadCount = await getUnreadCount(thread.id, user.id);

        return {
          ...thread,
          last_message: lastMessage?.body,
          last_message_at: lastMessage?.created_at,
          unread_count: unreadCount,
        };
      })
    );

    return processedThreads;
  } catch (error) {
    console.error('Get threads error:', error);
    return [];
  }
}

/**
 * Subscribe to thread messages in realtime
 */
export function subscribeToThread(
  threadId: string,
  onMessage: (message: Message) => void,
  onTyping?: (userId: string, isTyping: boolean) => void
): () => void {
  // Clean up existing subscription if any
  unsubscribeFromThread(threadId);

  const channel = supabase
    .channel(`thread:${threadId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `thread_id=eq.${threadId}`,
      },
      (payload: RealtimePostgresChangesPayload<Message>) => {
        if (payload.new) {
          onMessage(payload.new as Message);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `thread_id=eq.${threadId}`,
      },
      (payload: RealtimePostgresChangesPayload<Message>) => {
        if (payload.new) {
          onMessage(payload.new as Message);
        }
      }
    );

  // Subscribe to typing indicators if callback provided
  if (onTyping) {
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      Object.keys(state).forEach(userId => {
        const userState = state[userId][0] as any;
        onTyping(userId, userState?.typing || false);
      });
    });
  }

  // Subscribe to the channel
  channel.subscribe();

  // Store subscription
  activeSubscriptions.set(threadId, channel);

  // Return cleanup function
  return () => unsubscribeFromThread(threadId);
}

/**
 * Unsubscribe from thread
 */
export function unsubscribeFromThread(threadId: string): void {
  const channel = activeSubscriptions.get(threadId);
  if (channel) {
    supabase.removeChannel(channel);
    activeSubscriptions.delete(threadId);
  }
}

/**
 * Send typing indicator
 */
export async function sendTypingIndicator(
  threadId: string,
  isTyping: boolean
): Promise<void> {
  const channel = activeSubscriptions.get(threadId);
  if (channel) {
    await channel.track({ typing: isTyping });
  }
}

/**
 * Mark messages as read
 */
async function markMessagesAsRead(
  threadId: string,
  userId: string
): Promise<void> {
  try {
    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('thread_id', threadId)
      .neq('sender_id', userId)
      .is('read_at', null);
  } catch (error) {
    console.error('Mark as read error:', error);
  }
}

/**
 * Get unread message count for a thread
 */
async function getUnreadCount(
  threadId: string,
  userId: string
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('thread_id', threadId)
      .neq('sender_id', userId)
      .is('read_at', null);

    if (error) {
      console.error('Get unread count error:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Get unread count error:', error);
    return 0;
  }
}

/**
 * Validate user has access to thread
 */
async function validateThreadAccess(
  threadId: string,
  userId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('threads')
      .select('participants')
      .eq('id', threadId)
      .single();

    if (error || !data) return false;

    return (data.participants as string[]).includes(userId);
  } catch (error) {
    console.error('Validate access error:', error);
    return false;
  }
}

/**
 * Update thread's last message timestamp
 */
async function updateThreadLastMessage(
  threadId: string,
  lastMessage: string
): Promise<void> {
  try {
    await supabase
      .from('threads')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('id', threadId);
  } catch (error) {
    console.error('Update thread error:', error);
  }
}

/**
 * Delete a message (soft delete)
 */
export async function deleteMessage(messageId: string): Promise<MessageResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    // Verify ownership
    const { data: message } = await supabase
      .from('messages')
      .select('sender_id')
      .eq('id', messageId)
      .single();

    if (!message || message.sender_id !== user.id) {
      return {
        success: false,
        error: 'Permission denied',
      };
    }

    // Soft delete
    const { error } = await supabase
      .from('messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', messageId);

    if (error) {
      console.error('Delete message error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Delete message error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete message',
    };
  }
}

/**
 * Edit a message
 */
export async function editMessage(
  messageId: string,
  newBody: string
): Promise<MessageResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    // Verify ownership
    const { data: existingMessage } = await supabase
      .from('messages')
      .select('sender_id')
      .eq('id', messageId)
      .single();

    if (!existingMessage || existingMessage.sender_id !== user.id) {
      return {
        success: false,
        error: 'Permission denied',
      };
    }

    // Update message
    const { data: updatedMessage, error } = await supabase
      .from('messages')
      .update({
        body: newBody,
        edited_at: new Date().toISOString(),
      })
      .eq('id', messageId)
      .select()
      .single();

    if (error) {
      console.error('Edit message error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      message: updatedMessage as Message,
    };
  } catch (error) {
    console.error('Edit message error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to edit message',
    };
  }
}

/**
 * Report abusive message
 */
export async function reportMessage(
  messageId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    // Create moderation report (assuming a moderation_reports table exists)
    const { error } = await supabase
      .from('moderation_reports')
      .insert({
        reporter_id: user.id,
        message_id: messageId,
        reason,
        status: 'pending',
      });

    if (error) {
      console.error('Report message error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Report message error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to report message',
    };
  }
}

/**
 * Clean up all subscriptions
 */
export function cleanupAllSubscriptions(): void {
  activeSubscriptions.forEach((channel, threadId) => {
    supabase.removeChannel(channel);
  });
  activeSubscriptions.clear();
}