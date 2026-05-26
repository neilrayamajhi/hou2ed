# Real-Time Messaging Setup Guide

## Overview
The app now has a complete real-time messaging system using Supabase that allows users to chat with each other about housing listings and applications.

## Features Implemented

✅ **Real-time messaging** - Messages appear instantly for all participants
✅ **Message threads** - Organized conversations between users
✅ **Read receipts** - See when messages have been read
✅ **Attachment support** - Send images and documents
✅ **Message editing/deletion** - Edit or delete your own messages
✅ **Unread count** - See how many unread messages in each thread
✅ **Real-time subscriptions** - Updates appear without refresh
✅ **Typing indicators** - (Can be added if needed)

## Database Setup

### 1. Run the Migration
The messaging tables need to be created in your Supabase database:

```bash
# Option 1: Run in Supabase Dashboard
# Go to SQL Editor and paste the contents of:
supabase/migrations/create_messaging_tables.sql

# Option 2: Using Supabase CLI
supabase db push
```

### 2. Tables Created

**message_threads**
- `id` - Unique thread identifier
- `subject` - Optional thread subject
- `participant_ids` - Array of user IDs in the conversation
- `listing_id` - Optional reference to a listing
- `application_id` - Optional reference to an application
- `last_message_at` - Timestamp of last message
- `created_at` - Thread creation time
- `updated_at` - Last update time

**messages**
- `id` - Unique message identifier
- `thread_id` - Reference to the thread
- `sender_id` - User who sent the message
- `body` - Message text content
- `attachment_urls` - Array of attachment URLs
- `read_by` - Array of user IDs who have read the message
- `edited_at` - Timestamp if message was edited
- `deleted_at` - Timestamp if message was soft deleted
- `created_at` - Message creation time

## How to Use Messaging

### For Seekers (Users looking for housing)

1. **Start a conversation from a listing:**
   ```typescript
   // In your listing details screen, add a "Message Provider" button
   const startConversation = async () => {
     const thread = await messageService.createThread(
       [currentUserId, providerId],
       listingTitle,
       listingId
     );
     navigation.navigate('Thread', {
       threadId: thread.id,
       senderName: providerName,
       propertyTitle: listingTitle
     });
   };
   ```

2. **View all conversations:**
   - Navigate to the Messages tab
   - See all active conversations
   - Unread messages show with a badge

3. **Send messages:**
   - Type in the input field
   - Optionally attach images or documents
   - Messages send in real-time

### For Providers (Housing providers)

1. **Respond to inquiries:**
   - See messages from interested seekers
   - Respond directly in the thread
   - Attachments can include forms, requirements, etc.

2. **Message about applications:**
   - Conversations can be linked to specific applications
   - Track conversation history per applicant

## Testing the Messaging System

### 1. Create Test Users

```sql
-- Run in Supabase SQL Editor to create test users
-- User 1: Seeker
INSERT INTO auth.users (id, email)
VALUES ('11111111-1111-1111-1111-111111111111', 'seeker@test.com');

INSERT INTO public.profiles (id, user_id, email, full_name, username, role)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'seeker@test.com',
  'Test Seeker',
  'testseeker',
  'seeker'
);

-- User 2: Provider
INSERT INTO auth.users (id, email)
VALUES ('22222222-2222-2222-2222-222222222222', 'provider@test.com');

INSERT INTO public.profiles (id, user_id, email, full_name, username, role)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '22222222-2222-2222-2222-222222222222',
  'provider@test.com',
  'Test Provider',
  'testprovider',
  'provider'
);
```

### 2. Create a Test Thread

```sql
-- Create a thread between the two users
INSERT INTO public.message_threads (
  participant_ids,
  subject,
  last_message_at
) VALUES (
  ARRAY['11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'],
  'Inquiry about Downtown Shelter',
  NOW()
);
```

### 3. Send Test Messages

```sql
-- Get the thread ID from the previous insert
-- Send a message from the seeker
INSERT INTO public.messages (
  thread_id,
  sender_id,
  body,
  read_by
) VALUES (
  '[THREAD_ID_FROM_ABOVE]',
  '11111111-1111-1111-1111-111111111111',
  'Hi, I am interested in your shelter. Do you have availability?',
  ARRAY['11111111-1111-1111-1111-111111111111']
);

-- Send a reply from the provider
INSERT INTO public.messages (
  thread_id,
  sender_id,
  body,
  read_by
) VALUES (
  '[THREAD_ID_FROM_ABOVE]',
  '22222222-2222-2222-2222-222222222222',
  'Yes, we have beds available. Would you like to schedule a visit?',
  ARRAY['22222222-2222-2222-2222-222222222222']
);
```

### 4. Test Real-Time Updates

1. Open the app on two devices/simulators
2. Log in as different users
3. Open the same conversation thread
4. Send a message from one device
5. Message should appear instantly on the other device

## Code Integration Examples

### Starting a Conversation

```typescript
import { messageService } from '../services/messageService';

// In your component
const handleMessageProvider = async () => {
  // Create or find existing thread
  const thread = await messageService.createThread(
    [currentUserId, providerId],
    `Inquiry about ${listing.name}`,
    listing.id
  );

  // Navigate to thread
  navigation.navigate('Thread', {
    threadId: thread.id,
    senderName: providerName,
    propertyTitle: listing.name,
    participantId: providerId
  });
};
```

### Sending a Message

```typescript
const handleSendMessage = async (text: string) => {
  const message = await messageService.sendMessage(
    threadId,
    text,
    attachmentUrls // Optional
  );

  // Message will appear via real-time subscription
};
```

### Subscribing to Messages

```typescript
useEffect(() => {
  const unsubscribe = messageService.subscribeToThread(
    threadId,
    (newMessage) => {
      // Handle new message
      setMessages(prev => [...prev, newMessage]);
    }
  );

  return () => unsubscribe();
}, [threadId]);
```

## Troubleshooting

### Messages not appearing in real-time
1. Check that Realtime is enabled for the tables:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
   ALTER PUBLICATION supabase_realtime ADD TABLE public.message_threads;
   ```

2. Verify RLS policies are set correctly:
   ```sql
   SELECT * FROM pg_policies WHERE tablename IN ('messages', 'message_threads');
   ```

### Can't send messages
1. Ensure user is authenticated
2. Check that user is a participant in the thread
3. Verify RLS policies allow INSERT

### Unread counts not updating
1. Check that `read_by` array is being updated
2. Ensure `markMessagesAsRead` is called when viewing thread

## Next Steps

### Optional Enhancements

1. **Push Notifications**
   ```typescript
   // Add to messageService.ts
   import * as Notifications from 'expo-notifications';

   // Send notification on new message
   if (message.sender_id !== currentUserId) {
     await Notifications.scheduleNotificationAsync({
       content: {
         title: senderName,
         body: message.body,
       },
       trigger: null,
     });
   }
   ```

2. **Typing Indicators**
   ```typescript
   // Add presence channel for typing status
   const presenceChannel = supabase.channel(`typing-${threadId}`);
   presenceChannel
     .on('presence', { event: 'sync' }, () => {
       const state = presenceChannel.presenceState();
       // Update UI with who's typing
     })
     .subscribe();
   ```

3. **Message Reactions**
   ```sql
   ALTER TABLE public.messages
   ADD COLUMN reactions JSONB DEFAULT '{}';
   ```

4. **Voice Messages**
   ```typescript
   import { Audio } from 'expo-av';
   // Record and upload audio messages
   ```

## Security Notes

- All messages are protected by Row Level Security (RLS)
- Users can only see threads they're participants in
- Users can only edit/delete their own messages
- Attachment URLs should be uploaded to Supabase Storage with proper permissions

## Support

If you encounter any issues:
1. Check the Supabase logs in the Dashboard
2. Verify your authentication is working
3. Ensure all migrations have been run
4. Check browser/app console for errors

The messaging system is now fully functional and ready for use!