/**
 * Real-time Messaging Service
 * Handles all messaging operations with Supabase
 */

import { supabase } from '../lib/supabase';
import type {
  MessageThread,
  Message,
  MessageThreadInsert,
  MessageInsert,
  Profile
} from '../lib/supabase-types';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface MessageWithSender extends Message {
  sender?: Profile;
}

export interface ThreadWithDetails extends MessageThread {
  messages?: MessageWithSender[];
  participants?: Profile[];
  lastMessage?: MessageWithSender;
  unreadCount?: number;
}

class MessageService {
  private messageSubscriptions: Map<string, RealtimeChannel> = new Map();
  private threadSubscriptions: Map<string, RealtimeChannel> = new Map();
  private userId: string | null = null;
  private threadTableName: string = 'message_threads'; // Will fallback to 'threads' if needed

  /**
   * Initialize the service with current user
   */
  async initialize() {
    const { data: { user } } = await supabase.auth.getUser();
    this.userId = user?.id || null;

    // Check which table name to use
    await this.detectThreadTableName();

    return this.userId;
  }

  /**
   * Detect whether to use 'message_threads' or 'threads' table
   */
  private async detectThreadTableName() {
    try {
      // Try to query message_threads table
      const { error: messageThreadsError } = await supabase
        .from('message_threads')
        .select('id')
        .limit(0);

      if (!messageThreadsError) {
        this.threadTableName = 'message_threads';
        return;
      }

      // If message_threads doesn't exist, try threads
      if (messageThreadsError.code === 'PGRST205') {
        const { error: threadsError } = await supabase
          .from('threads')
          .select('id')
          .limit(0);

        if (!threadsError) {
          this.threadTableName = 'threads';
          console.warn('Using "threads" table (legacy). Please run database migration.');
          return;
        }

        // Neither table exists
        if (threadsError.code === 'PGRST205') {
          console.error('⚠️ No messaging tables found. Please run the database migration to create them.');
          console.error('Run the SQL from /Users/neilrayamajhi/h2d/CREATE_MESSAGING_TABLES.sql in Supabase');
          // Use message_threads as default (will fail but with better error)
          this.threadTableName = 'message_threads';
          return;
        }
      }

      // Some other error
      console.error('Error detecting thread table:', messageThreadsError);
      this.threadTableName = 'message_threads';
    } catch (error) {
      console.error('Error detecting thread table name:', error);
      this.threadTableName = 'message_threads';
    }
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): string | null {
    return this.userId;
  }

  /**
   * Create a new message thread
   */
  async createThread(
    participantIds: string[],
    subject?: string,
    listingId?: string,
    applicationId?: string
  ): Promise<MessageThread | null> {
    try {
      // Ensure current user is included
      if (this.userId && !participantIds.includes(this.userId)) {
        participantIds.push(this.userId);
      }

      // Check if thread already exists
      const existingThread = await this.findExistingThread(
        participantIds,
        listingId,
        applicationId
      );

      if (existingThread) {
        return existingThread;
      }

      // Create new thread
      const threadData: MessageThreadInsert = {
        participant_ids: participantIds,
        subject,
        listing_id: listingId,
        application_id: applicationId,
        last_message_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from(this.threadTableName)
        .insert(threadData)
        .select()
        .single();

      if (error) {
        console.error('Error creating thread:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in createThread:', error);
      return null;
    }
  }

  /**
   * Find existing thread between participants
   */
  private async findExistingThread(
    participantIds: string[],
    listingId?: string,
    applicationId?: string
  ): Promise<MessageThread | null> {
    try {
      let query = supabase
        .from(this.threadTableName)
        .select('*')
        .contains('participant_ids', participantIds);

      if (listingId) {
        query = query.eq('listing_id', listingId);
      }

      if (applicationId) {
        query = query.eq('application_id', applicationId);
      }

      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error finding thread:', error);
      }

      return data;
    } catch (error) {
      console.error('Error in findExistingThread:', error);
      return null;
    }
  }

  /**
   * Get all threads for current user
   */
  async getThreads(): Promise<ThreadWithDetails[]> {
    if (!this.userId) {
      await this.initialize();
    }

    try {
      const { data: threads, error } = await supabase
        .from(this.threadTableName)
        .select(`
          *,
          messages (
            *,
            profiles!sender_id (
              id,
              full_name,
              username,
              avatar_url,
              role
            )
          )
        `)
        .contains('participant_ids', [this.userId!])
        .order('last_message_at', { ascending: false });

      if (error) {
        // If table doesn't exist, return empty array instead of crashing
        if (error.code === 'PGRST205') {
          console.warn('Message threads table not found. Messaging system needs to be initialized.');
          return [];
        }
        console.error('Error fetching threads:', error);
        return [];
      }

      // Process threads to add computed fields
      const processedThreads = await Promise.all(
        (threads || []).map(async (thread: any) => {
          // Get participant profiles
          const { data: participants } = await supabase
            .from('profiles')
            .select('*')
            .in('id', thread.participant_ids);

          // Process messages with sender profiles
          const processedMessages = thread.messages?.map((msg: any) => ({
            ...msg,
            sender: msg.profiles || null
          }));

          // Get last message
          const lastMessage = processedMessages
            ?.sort((a: any, b: any) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0];

          // Count unread messages
          const unreadCount = processedMessages?.filter(
            (msg: any) =>
              msg.sender_id !== this.userId &&
              !msg.read_by?.includes(this.userId!)
          ).length || 0;

          return {
            ...thread,
            participants: participants || [],
            lastMessage,
            unreadCount
          };
        })
      );

      return processedThreads;
    } catch (error) {
      console.error('Error in getThreads:', error);
      return [];
    }
  }

  /**
   * Get single thread with messages
   */
  async getThread(threadId: string): Promise<ThreadWithDetails | null> {
    try {
      const { data: thread, error } = await supabase
        .from(this.threadTableName)
        .select(`
          *,
          messages (
            *,
            profiles!sender_id (
              id,
              full_name,
              username,
              avatar_url,
              role
            )
          )
        `)
        .eq('id', threadId)
        .single();

      if (error) {
        console.error('Error fetching thread:', error);
        return null;
      }

      // Get participant profiles
      const { data: participants } = await supabase
        .from('profiles')
        .select('*')
        .in('id', thread.participant_ids);

      // Process messages with sender profiles
      const processedMessages = thread.messages?.map((msg: any) => ({
        ...msg,
        sender: msg.profiles || null
      }));

      // Sort messages by timestamp
      if (processedMessages) {
        processedMessages.sort((a: any, b: any) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      }

      return {
        ...thread,
        messages: processedMessages || [],
        participants: participants || []
      };
    } catch (error) {
      console.error('Error in getThread:', error);
      return null;
    }
  }

  /**
   * Send a message in a thread
   */
  async sendMessage(
    threadId: string,
    body: string,
    attachmentUrls?: string[]
  ): Promise<Message | null> {
    if (!this.userId) {
      await this.initialize();
    }

    try {
      const messageData: MessageInsert = {
        thread_id: threadId,
        sender_id: this.userId!,
        body,
        attachment_urls: attachmentUrls,
        read_by: [this.userId!], // Sender has read their own message
      };

      const { data: message, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select(`
          *,
          profiles!sender_id (
            id,
            full_name,
            username,
            avatar_url,
            role
          )
        `)
        .single();

      if (error) {
        console.error('Error sending message:', error);
        return null;
      }

      // Update thread's last_message_at
      await supabase
        .from(this.threadTableName)
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', threadId);

      return message;
    } catch (error) {
      console.error('Error in sendMessage:', error);
      return null;
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(threadId: string): Promise<boolean> {
    if (!this.userId) {
      await this.initialize();
    }

    try {
      // Get all unread messages in the thread
      const { data: messages, error: fetchError } = await supabase
        .from('messages')
        .select('id, read_by')
        .eq('thread_id', threadId)
        .not('sender_id', 'eq', this.userId!);

      if (fetchError) {
        console.error('Error fetching messages:', fetchError);
        return false;
      }

      // Update unread messages
      const unreadMessages = messages?.filter(
        msg => !msg.read_by?.includes(this.userId!)
      );

      if (unreadMessages && unreadMessages.length > 0) {
        const updates = unreadMessages.map(msg => ({
          id: msg.id,
          read_by: [...(msg.read_by || []), this.userId!]
        }));

        for (const update of updates) {
          await supabase
            .from('messages')
            .update({ read_by: update.read_by })
            .eq('id', update.id);
        }
      }

      return true;
    } catch (error) {
      console.error('Error in markMessagesAsRead:', error);
      return false;
    }
  }

  /**
   * Subscribe to new messages in a thread
   */
  subscribeToThread(
    threadId: string,
    onMessage: (message: MessageWithSender) => void
  ): () => void {
    // Clean up existing subscription
    this.unsubscribeFromThread(threadId);

    const channel = supabase
      .channel(`thread-${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${threadId}`,
        },
        async (payload) => {
          // Fetch sender profile
          const { data: sender } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', payload.new.sender_id)
            .single();

          const messageWithSender: MessageWithSender = {
            ...payload.new as Message,
            sender
          };

          onMessage(messageWithSender);
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
        async (payload) => {
          // Handle message updates (edits, read receipts)
          const { data: sender } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', payload.new.sender_id)
            .single();

          const messageWithSender: MessageWithSender = {
            ...payload.new as Message,
            sender
          };

          onMessage(messageWithSender);
        }
      )
      .subscribe();

    this.messageSubscriptions.set(threadId, channel);

    // Return unsubscribe function
    return () => this.unsubscribeFromThread(threadId);
  }

  /**
   * Subscribe to all threads for the user (for inbox updates)
   */
  subscribeToInbox(
    onUpdate: (thread: MessageThread) => void
  ): () => void {
    if (!this.userId) {
      console.warn('User not initialized');
      return () => {};
    }

    const channel = supabase
      .channel('inbox-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: this.threadTableName,
        },
        async (payload) => {
          // Check if user is a participant
          const thread = payload.new as MessageThread;
          if (thread.participant_ids?.includes(this.userId!)) {
            onUpdate(thread);
          }
        }
      )
      .subscribe();

    this.threadSubscriptions.set('inbox', channel);

    return () => this.unsubscribeFromInbox();
  }

  /**
   * Unsubscribe from thread updates
   */
  private unsubscribeFromThread(threadId: string) {
    const channel = this.messageSubscriptions.get(threadId);
    if (channel) {
      channel.unsubscribe();
      this.messageSubscriptions.delete(threadId);
    }
  }

  /**
   * Unsubscribe from inbox updates
   */
  private unsubscribeFromInbox() {
    const channel = this.threadSubscriptions.get('inbox');
    if (channel) {
      channel.unsubscribe();
      this.threadSubscriptions.delete('inbox');
    }
  }

  /**
   * Clean up all subscriptions
   */
  cleanup() {
    // Unsubscribe from all message channels
    this.messageSubscriptions.forEach(channel => channel.unsubscribe());
    this.messageSubscriptions.clear();

    // Unsubscribe from all thread channels
    this.threadSubscriptions.forEach(channel => channel.unsubscribe());
    this.threadSubscriptions.clear();
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(messageId: string): Promise<boolean> {
    if (!this.userId) {
      await this.initialize();
    }

    try {
      const { error } = await supabase
        .from('messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('sender_id', this.userId!);

      if (error) {
        console.error('Error deleting message:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteMessage:', error);
      return false;
    }
  }

  /**
   * Edit a message
   */
  async editMessage(messageId: string, newBody: string): Promise<boolean> {
    if (!this.userId) {
      await this.initialize();
    }

    try {
      const { error } = await supabase
        .from('messages')
        .update({
          body: newBody,
          edited_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .eq('sender_id', this.userId!);

      if (error) {
        console.error('Error editing message:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in editMessage:', error);
      return false;
    }
  }
}

// Export singleton instance
export const messageService = new MessageService();