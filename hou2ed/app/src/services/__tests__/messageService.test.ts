import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { messageService } from '../messageService';
import { supabase } from '../../lib/supabase';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
    channel: vi.fn(),
  },
}));

describe('messageService', () => {
  const mockUserId = 'user-123';
  const mockThreadId = 'thread-456';
  const mockParticipantId = 'participant-789';

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset service state
    messageService['userId'] = null;
    messageService['messageSubscriptions'].clear();
    messageService['threadSubscriptions'].clear();
  });

  afterEach(() => {
    messageService.cleanup();
  });

  describe('initialize', () => {
    it('should initialize with current user ID', async () => {
      const mockUser = { id: mockUserId };
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const userId = await messageService.initialize();

      expect(userId).toBe(mockUserId);
      expect(messageService.getCurrentUserId()).toBe(mockUserId);
    });

    it('should handle missing user', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const userId = await messageService.initialize();

      expect(userId).toBeNull();
      expect(messageService.getCurrentUserId()).toBeNull();
    });
  });

  describe('createThread', () => {
    beforeEach(() => {
      messageService['userId'] = mockUserId;
    });

    it('should create new thread with participants', async () => {
      const mockThread = {
        id: mockThreadId,
        participant_ids: [mockUserId, mockParticipantId],
        subject: 'Test Thread',
        listing_id: null,
        application_id: null,
        last_message_at: new Date().toISOString(),
      };

      const fromMock = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockThread, error: null }),
        contains: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      vi.mocked(supabase.from).mockReturnValue(fromMock as any);

      const thread = await messageService.createThread(
        [mockParticipantId],
        'Test Thread'
      );

      expect(thread).toEqual(mockThread);
      expect(fromMock.insert).toHaveBeenCalledWith({
        participant_ids: [mockParticipantId, mockUserId],
        subject: 'Test Thread',
        listing_id: undefined,
        application_id: undefined,
        last_message_at: expect.any(String),
      });
    });

    it('should return existing thread if found', async () => {
      const existingThread = {
        id: 'existing-thread',
        participant_ids: [mockUserId, mockParticipantId],
      };

      const fromMock = {
        select: vi.fn().mockReturnThis(),
        contains: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: existingThread, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(fromMock as any);

      const thread = await messageService.createThread([mockParticipantId]);

      expect(thread).toEqual(existingThread);
    });
  });

  describe('sendMessage', () => {
    beforeEach(() => {
      messageService['userId'] = mockUserId;
    });

    it('should send message and update thread', async () => {
      const mockMessage = {
        id: 'msg-123',
        thread_id: mockThreadId,
        sender_id: mockUserId,
        body: 'Test message',
        attachment_urls: null,
        read_by: [mockUserId],
        created_at: new Date().toISOString(),
      };

      const messageFromMock = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockMessage, error: null }),
      };

      const threadFromMock = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
      };

      vi.mocked(supabase.from)
        .mockReturnValueOnce(messageFromMock as any)
        .mockReturnValueOnce(threadFromMock as any);

      const message = await messageService.sendMessage(
        mockThreadId,
        'Test message'
      );

      expect(message).toEqual(mockMessage);
      expect(messageFromMock.insert).toHaveBeenCalledWith({
        thread_id: mockThreadId,
        sender_id: mockUserId,
        body: 'Test message',
        attachment_urls: undefined,
        read_by: [mockUserId],
      });
    });

    it('should handle send failure', async () => {
      const fromMock = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Send failed')
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(fromMock as any);

      const message = await messageService.sendMessage(
        mockThreadId,
        'Test message'
      );

      expect(message).toBeNull();
    });
  });

  describe('markMessagesAsRead', () => {
    beforeEach(() => {
      messageService['userId'] = mockUserId;
    });

    it('should mark unread messages as read', async () => {
      const unreadMessages = [
        { id: 'msg-1', read_by: [] },
        { id: 'msg-2', read_by: ['other-user'] },
      ];

      const selectMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({
          data: unreadMessages,
          error: null
        }),
      };

      const updateMock = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
      };

      vi.mocked(supabase.from)
        .mockReturnValueOnce(selectMock as any)
        .mockReturnValueOnce(updateMock as any)
        .mockReturnValueOnce(updateMock as any);

      const result = await messageService.markMessagesAsRead(mockThreadId);

      expect(result).toBe(true);
    });
  });

  describe('subscribeToThread', () => {
    it('should create subscription channel', () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn(),
      };

      vi.mocked(supabase.channel).mockReturnValue(mockChannel as any);

      const onMessage = vi.fn();
      const unsubscribe = messageService.subscribeToThread(
        mockThreadId,
        onMessage
      );

      expect(supabase.channel).toHaveBeenCalledWith(`thread-${mockThreadId}`);
      expect(mockChannel.on).toHaveBeenCalledTimes(2); // INSERT and UPDATE
      expect(mockChannel.subscribe).toHaveBeenCalled();

      // Test unsubscribe
      unsubscribe();
      expect(mockChannel.unsubscribe).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should unsubscribe all channels', () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn(),
      };

      vi.mocked(supabase.channel).mockReturnValue(mockChannel as any);

      // Create some subscriptions
      messageService.subscribeToThread('thread-1', vi.fn());
      messageService.subscribeToThread('thread-2', vi.fn());
      messageService.subscribeToInbox(vi.fn());

      // Clean up
      messageService.cleanup();

      expect(mockChannel.unsubscribe).toHaveBeenCalledTimes(3);
    });
  });
});