import { supabase } from "../lib/supabase";

// Types
interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  attachment_urls?: string[];
  read_by: string[];
  deleted_at: string | null;
  edited_at: string | null;
  created_at: string;
  updated_at: string;
}

interface MessageWithSender extends Message {
  sender: any;
}

interface Thread {
  id: string;
  subject?: string;
  participant_ids: string[];
  listing_id?: string;
  application_id?: string;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  participants?: any[];
  messages?: MessageWithSender[];
  unread_count?: number;
}

class MessageServiceFix {
  private userId: string | null = null;
  private threadTableName: "message_threads" | "threads" = "message_threads";
  private messageSubscriptions: Map<string, any> = new Map();
  private inboxSubscription: any = null;
  private profileCache: Map<string, any> = new Map();
  private profileCacheTimeout: NodeJS.Timeout | null = null;

  /**
   * Initialize the service with current user
   * @param userId - Optional user ID to use. If not provided, will try to get from Supabase auth
   */
  async initialize(userId?: string): Promise<string | null> {
    try {
      // Require userId to be provided - don't attempt auth fetch
      if (!userId) {
        console.error("❌ No userId provided to message service initialization");
        throw new Error("userId is required for message service initialization");
      }

      console.log("✅ Initializing message service with userId:", userId);
      this.userId = userId;

      // Check which table name to use
      await this.detectThreadTableName();

      // Start profile cache cleanup
      this.startProfileCacheCleanup();

      return this.userId;
    } catch (error) {
      console.error("Failed to initialize message service:", error);
      throw error;
    }
  }

  /**
   * Detect whether to use 'message_threads' or 'threads' table
   */
  private async detectThreadTableName() {
    try {
      // Try to query message_threads table
      const { error: messageThreadsError } = await supabase
        .from("message_threads")
        .select("id")
        .limit(0);

      if (!messageThreadsError) {
        this.threadTableName = "message_threads";
        console.log("✅ Using message_threads table");
        return;
      }

      // If message_threads doesn't exist, check error code
      if (
        messageThreadsError.code === "PGRST205" ||
        messageThreadsError.message?.includes("relation") ||
        messageThreadsError.message?.includes("does not exist")
      ) {
        console.error("❌ message_threads table not found");
        throw new Error(
          "Messaging tables not configured. Please run database migration.",
        );
      }

      // Some other error (likely RLS)
      console.warn(
        "⚠️ Error accessing message_threads:",
        messageThreadsError.message,
      );
      this.threadTableName = "message_threads";
    } catch (error) {
      console.error("Error detecting thread table name:", error);
      throw error;
    }
  }

  /**
   * Start periodic cleanup of profile cache
   */
  private startProfileCacheCleanup() {
    // Clear cache every 5 minutes
    this.profileCacheTimeout = setInterval(
      () => {
        this.profileCache.clear();
      },
      5 * 60 * 1000,
    );
  }

  /**
   * Get cached profile or fetch from database
   */
  private async getCachedProfile(userId: string): Promise<any> {
    // Check cache first
    if (this.profileCache.has(userId)) {
      return this.profileCache.get(userId);
    }

    // Fetch from database
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (!error && profile) {
      this.profileCache.set(userId, profile);
    }

    return profile;
  }

  /**
   * Batch fetch profiles for multiple user IDs
   */
  private async getBatchProfiles(userIds: string[]): Promise<Map<string, any>> {
    const uniqueIds = [...new Set(userIds)];
    const profiles = new Map<string, any>();

    // Check cache first
    const uncachedIds = uniqueIds.filter((id) => {
      if (this.profileCache.has(id)) {
        profiles.set(id, this.profileCache.get(id));
        return false;
      }
      return true;
    });

    // Fetch uncached profiles
    if (uncachedIds.length > 0) {
      const { data: fetchedProfiles, error } = await supabase
        .from("profiles")
        .select("*")
        .in("id", uncachedIds);

      if (!error && fetchedProfiles) {
        fetchedProfiles.forEach((profile) => {
          this.profileCache.set(profile.id, profile);
          profiles.set(profile.id, profile);
        });
      }
    }

    return profiles;
  }

  /**
   * Create a new thread or find existing one
   */
  async createThread(
    participantIds: string[],
    subject?: string,
    listingId?: string,
    applicationId?: string,
  ): Promise<Thread> {
    try {
      if (!this.userId) {
        throw new Error("User not initialized");
      }

      // Ensure current user is included
      const allParticipants = [...new Set([this.userId, ...participantIds])];

      // Check for existing thread with same participants
      const { data: existingThreads, error: searchError } = await supabase
        .from(this.threadTableName)
        .select("*")
        .contains("participant_ids", allParticipants)
        .order("created_at", { ascending: false });

      if (searchError) {
        console.error("Error searching for existing thread:", searchError);
        throw searchError;
      }

      // Find exact match
      const existingThread = existingThreads?.find((thread) => {
        const threadParticipants = [...thread.participant_ids].sort();
        const searchParticipants = [...allParticipants].sort();
        return (
          JSON.stringify(threadParticipants) ===
          JSON.stringify(searchParticipants)
        );
      });

      if (existingThread) {
        return existingThread;
      }

      // Create new thread
      const { data: newThread, error: createError } = await supabase
        .from(this.threadTableName)
        .insert({
          subject,
          participant_ids: allParticipants,
          listing_id: listingId,
          application_id: applicationId,
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating thread:", createError);
        throw createError;
      }

      return newThread;
    } catch (error) {
      console.error("Failed to create thread:", error);
      throw error;
    }
  }

  /**
   * Get all threads for current user with optimized profile fetching
   */
  async getThreads(): Promise<Thread[]> {
    try {
      if (!this.userId) {
        throw new Error("User not initialized");
      }

      // Get threads
      const { data: threads, error } = await supabase
        .from(this.threadTableName)
        .select("*")
        .contains("participant_ids", [this.userId])
        .order("last_message_at", { ascending: false });

      if (error) {
        console.error("Error fetching threads:", error);
        throw error;
      }

      if (!threads || threads.length === 0) {
        return [];
      }

      // Collect all participant IDs
      const allParticipantIds = new Set<string>();
      threads.forEach((thread) => {
        thread.participant_ids.forEach((id: string) =>
          allParticipantIds.add(id),
        );
      });

      // Batch fetch all profiles
      const profileMap = await this.getBatchProfiles([...allParticipantIds]);

      // Get last messages for each thread
      const threadIds = threads.map((t) => t.id);
      const { data: messages, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .in("thread_id", threadIds)
        .order("created_at", { ascending: false });

      if (messagesError) {
        console.error("Error fetching messages:", messagesError);
      }

      // Group messages by thread
      const messagesByThread = new Map<string, any[]>();
      messages?.forEach((msg) => {
        if (!messagesByThread.has(msg.thread_id)) {
          messagesByThread.set(msg.thread_id, []);
        }
        messagesByThread.get(msg.thread_id)!.push(msg);
      });

      // Process threads
      return threads.map((thread) => {
        // Add participants
        const participants = thread.participant_ids
          .map((id: string) => profileMap.get(id))
          .filter(Boolean);

        // Get messages for this thread
        const threadMessages = messagesByThread.get(thread.id) || [];

        // Calculate unread count
        const unreadCount = threadMessages.filter(
          (msg: any) =>
            msg.sender_id !== this.userId &&
            !msg.read_by?.includes(this.userId!),
        ).length;

        return {
          ...thread,
          participants,
          unread_count: unreadCount,
        };
      });
    } catch (error) {
      console.error("Failed to get threads:", error);
      throw error;
    }
  }

  /**
   * Get a single thread with messages (optimized)
   */
  async getThread(threadId: string): Promise<Thread | null> {
    try {
      if (!this.userId) {
        throw new Error("User not initialized");
      }

      // Get thread
      const { data: thread, error: threadError } = await supabase
        .from(this.threadTableName)
        .select("*")
        .eq("id", threadId)
        .single();

      if (threadError) {
        console.error("Error fetching thread:", threadError);
        throw threadError;
      }

      // Get messages
      const { data: messages, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });

      if (messagesError) {
        console.error("Error fetching messages:", messagesError);
        throw messagesError;
      }

      // Batch fetch profiles for all participants and message senders
      const allUserIds = new Set<string>([...thread.participant_ids]);
      messages?.forEach((msg) => allUserIds.add(msg.sender_id));

      const profileMap = await this.getBatchProfiles([...allUserIds]);

      // Add sender info to messages
      const messagesWithSenders =
        messages?.map((msg) => ({
          ...msg,
          sender: profileMap.get(msg.sender_id),
        })) || [];

      // Add participants to thread
      const participants = thread.participant_ids
        .map((id: string) => profileMap.get(id))
        .filter(Boolean);

      return {
        ...thread,
        participants,
        messages: messagesWithSenders,
      };
    } catch (error) {
      console.error("Failed to get thread:", error);
      throw error;
    }
  }

  /**
   * Send a message with proper error handling
   */
  async sendMessage(
    threadId: string,
    body: string,
    attachmentUrls?: string[],
  ): Promise<MessageWithSender> {
    try {
      if (!this.userId) {
        throw new Error("User not initialized");
      }

      if (!body?.trim() && (!attachmentUrls || attachmentUrls.length === 0)) {
        throw new Error("Message must have content or attachments");
      }

      // Insert message - use 'content' field as per database schema
      console.log("📤 Sending message to thread:", threadId);
      const { data: message, error } = await supabase
        .from("messages")
        .insert({
          thread_id: threadId,
          sender_id: this.userId,
          content: body?.trim() || "", // Changed from 'body' to 'content'
          attachment_urls: attachmentUrls || [],
          read_by: [this.userId],
        })
        .select()
        .single();

      if (error) {
        console.error("❌ Error sending message:", error);
        console.error("Error details:", {
          code: error.code,
          message: error.message,
          details: error.details,
        });
        throw error;
      }

      console.log("✅ Message sent successfully:", message.id);

      // Update thread's last_message_at
      const { error: updateError } = await supabase
        .from(this.threadTableName)
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", threadId);

      if (updateError) {
        console.error("Error updating thread timestamp:", updateError);
      }

      // Get sender profile from cache
      const sender = await this.getCachedProfile(this.userId);

      return {
        ...message,
        sender,
      };
    } catch (error) {
      console.error("Failed to send message:", error);
      throw error;
    }
  }

  /**
   * Mark messages as read (optimized batch update)
   */
  async markMessagesAsRead(
    threadId: string,
    messageIds: string[] | undefined,
  ): Promise<void> {
    try {
      // Add defensive check for undefined messageIds
      if (!this.userId || !messageIds || messageIds.length === 0) {
        if (!messageIds) {
          console.warn("⚠️ markMessagesAsRead called with undefined messageIds");
        }
        return;
      }

      // Batch update all messages at once
      const { error } = await supabase.rpc("add_user_to_read_by", {
        p_message_ids: messageIds,
        p_user_id: this.userId,
      });

      if (error) {
        console.error("Error marking messages as read:", error);

        // Fallback to individual updates if RPC doesn't exist
        if (error.code === "PGRST202") {
          for (const messageId of messageIds) {
            const { data: message } = await supabase
              .from("messages")
              .select("read_by")
              .eq("id", messageId)
              .single();

            if (message && !message.read_by?.includes(this.userId!)) {
              await supabase
                .from("messages")
                .update({
                  read_by: [...(message.read_by || []), this.userId],
                })
                .eq("id", messageId);
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to mark messages as read:", error);
    }
  }

  /**
   * Subscribe to new messages in a thread (optimized)
   */
  subscribeToThread(
    threadId: string,
    onMessage: (message: MessageWithSender) => void,
  ): () => void {
    try {
      // Clean up existing subscription
      this.unsubscribeFromThread(threadId);

      const channel = supabase
        .channel(`thread-${threadId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `thread_id=eq.${threadId}`,
          },
          async (payload) => {
            try {
              // Get sender profile from cache
              const sender = await this.getCachedProfile(payload.new.sender_id);

              const messageWithSender: MessageWithSender = {
                ...(payload.new as Message),
                sender,
              };

              onMessage(messageWithSender);
            } catch (error) {
              console.error("Error processing new message:", error);
            }
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "messages",
            filter: `thread_id=eq.${threadId}`,
          },
          async (payload) => {
            try {
              // Get sender profile from cache
              const sender = await this.getCachedProfile(payload.new.sender_id);

              const messageWithSender: MessageWithSender = {
                ...(payload.new as Message),
                sender,
              };

              onMessage(messageWithSender);
            } catch (error) {
              console.error("Error processing message update:", error);
            }
          },
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            console.log(`✅ Subscribed to thread ${threadId}`);
          } else if (status === "CLOSED") {
            console.log(`⚠️ Subscription closed for thread ${threadId}`);
          } else if (status === "CHANNEL_ERROR") {
            console.error(`❌ Subscription error for thread ${threadId}`);
          }
        });

      this.messageSubscriptions.set(threadId, channel);

      // Return unsubscribe function
      return () => this.unsubscribeFromThread(threadId);
    } catch (error) {
      console.error("Failed to subscribe to thread:", error);
      return () => {};
    }
  }

  /**
   * Unsubscribe from a thread
   */
  unsubscribeFromThread(threadId: string) {
    const channel = this.messageSubscriptions.get(threadId);
    if (channel) {
      channel.unsubscribe();
      this.messageSubscriptions.delete(threadId);
    }
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(messageId: string): Promise<boolean> {
    try {
      if (!this.userId) {
        throw new Error("User not initialized");
      }

      const { error } = await supabase
        .from("messages")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", messageId)
        .eq("sender_id", this.userId);

      if (error) {
        console.error("Error deleting message:", error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error("Failed to delete message:", error);
      throw error;
    }
  }

  /**
   * Edit a message
   */
  async editMessage(
    messageId: string,
    newBody: string,
  ): Promise<Message | null> {
    try {
      if (!this.userId) {
        throw new Error("User not initialized");
      }

      if (!newBody?.trim()) {
        throw new Error("Message body cannot be empty");
      }

      const { data: message, error } = await supabase
        .from("messages")
        .update({
          body: newBody.trim(),
          edited_at: new Date().toISOString(),
        })
        .eq("id", messageId)
        .eq("sender_id", this.userId)
        .select()
        .single();

      if (error) {
        console.error("Error editing message:", error);
        throw error;
      }

      return message;
    } catch (error) {
      console.error("Failed to edit message:", error);
      throw error;
    }
  }

  /**
   * Subscribe to inbox updates
   */
  subscribeToInbox(onUpdate: () => void): () => void {
    try {
      // Return no-op if not initialized yet
      if (!this.userId) {
        console.warn("⚠️ subscribeToInbox called before initialization, skipping");
        return () => {}; // Return no-op cleanup function
      }

      // Clean up existing subscription
      this.unsubscribeFromInbox();

      this.inboxSubscription = supabase
        .channel("inbox-updates")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: this.threadTableName,
          },
          (payload) => {
            // Check if user is participant
            if (payload.new?.participant_ids?.includes(this.userId!)) {
              onUpdate();
            }
          },
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            console.log("✅ Subscribed to inbox updates");
          } else if (status === "CLOSED") {
            console.log("⚠️ Inbox subscription closed");
          } else if (status === "CHANNEL_ERROR") {
            console.error("❌ Inbox subscription error");
          }
        });

      return () => this.unsubscribeFromInbox();
    } catch (error) {
      console.error("Failed to subscribe to inbox:", error);
      return () => {};
    }
  }

  /**
   * Unsubscribe from inbox updates
   */
  unsubscribeFromInbox() {
    if (this.inboxSubscription) {
      this.inboxSubscription.unsubscribe();
      this.inboxSubscription = null;
    }
  }

  /**
   * Cleanup all subscriptions
   */
  cleanup() {
    // Unsubscribe from all message threads
    this.messageSubscriptions.forEach((channel) => channel.unsubscribe());
    this.messageSubscriptions.clear();

    // Unsubscribe from inbox
    this.unsubscribeFromInbox();

    // Clear profile cache
    this.profileCache.clear();
    if (this.profileCacheTimeout) {
      clearInterval(this.profileCacheTimeout);
      this.profileCacheTimeout = null;
    }
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): string | null {
    return this.userId;
  }
}

// Export singleton instance
export const messageService = new MessageServiceFix();
