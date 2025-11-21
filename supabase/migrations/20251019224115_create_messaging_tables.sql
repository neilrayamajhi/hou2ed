-- CREATE MESSAGING TABLES FROM SCRATCH
-- Run this in Supabase SQL Editor to create the messaging system tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 1: Create message_threads table
CREATE TABLE IF NOT EXISTS message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT,
  participant_ids UUID[] NOT NULL,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create or update messages table with all required columns
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  attachment_urls TEXT[] DEFAULT '{}',
  read_by UUID[] DEFAULT '{}',
  deleted_at TIMESTAMPTZ, -- For soft deletion
  edited_at TIMESTAMPTZ,  -- For tracking edits
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Add missing columns to messages if table already exists
DO $$
BEGIN
  -- Add deleted_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE messages ADD COLUMN deleted_at TIMESTAMPTZ;
    RAISE NOTICE 'Added deleted_at column to messages';
  END IF;

  -- Add edited_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'edited_at'
  ) THEN
    ALTER TABLE messages ADD COLUMN edited_at TIMESTAMPTZ;
    RAISE NOTICE 'Added edited_at column to messages';
  END IF;

  -- Add attachment_urls if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'attachment_urls'
  ) THEN
    ALTER TABLE messages ADD COLUMN attachment_urls TEXT[] DEFAULT '{}';
    RAISE NOTICE 'Added attachment_urls column to messages';
  END IF;

  -- Ensure read_by is an array type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages'
    AND column_name = 'read_by'
    AND data_type != 'ARRAY'
  ) THEN
    ALTER TABLE messages DROP COLUMN IF EXISTS read_by CASCADE;
    ALTER TABLE messages ADD COLUMN read_by UUID[] DEFAULT '{}';
    RAISE NOTICE 'Fixed read_by column to be UUID array';
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'read_by'
  ) THEN
    ALTER TABLE messages ADD COLUMN read_by UUID[] DEFAULT '{}';
    RAISE NOTICE 'Added read_by column as UUID array';
  END IF;
END $$;

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_message_threads_participants ON message_threads USING GIN (participant_ids);
CREATE INDEX IF NOT EXISTS idx_message_threads_last_message ON message_threads(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_threads_listing ON message_threads(listing_id) WHERE listing_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_message_threads_application ON message_threads(application_id) WHERE application_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON messages(deleted_at) WHERE deleted_at IS NULL;

-- Step 5: Enable Row Level Security
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies for message_threads
DROP POLICY IF EXISTS "Users can view threads they participate in" ON message_threads;
CREATE POLICY "Users can view threads they participate in"
  ON message_threads FOR SELECT
  USING (auth.uid() = ANY(participant_ids));

DROP POLICY IF EXISTS "Users can create threads they participate in" ON message_threads;
CREATE POLICY "Users can create threads they participate in"
  ON message_threads FOR INSERT
  WITH CHECK (auth.uid() = ANY(participant_ids));

DROP POLICY IF EXISTS "Users can update threads they participate in" ON message_threads;
CREATE POLICY "Users can update threads they participate in"
  ON message_threads FOR UPDATE
  USING (auth.uid() = ANY(participant_ids));

-- Step 7: Create RLS policies for messages
DROP POLICY IF EXISTS "Users can view messages in their threads" ON messages;
CREATE POLICY "Users can view messages in their threads"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM message_threads
      WHERE id = messages.thread_id
      AND auth.uid() = ANY(participant_ids)
    )
  );

DROP POLICY IF EXISTS "Users can send messages in their threads" ON messages;
CREATE POLICY "Users can send messages in their threads"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM message_threads
      WHERE id = thread_id
      AND auth.uid() = ANY(participant_ids)
    )
  );

DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;
CREATE POLICY "Users can delete their own messages"
  ON messages FOR DELETE
  USING (sender_id = auth.uid());

-- Step 8: Create functions for updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 9: Create triggers for updated_at
DROP TRIGGER IF EXISTS update_message_threads_updated_at ON message_threads;
CREATE TRIGGER update_message_threads_updated_at
  BEFORE UPDATE ON message_threads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 10: Create function to update thread's last_message_at
CREATE OR REPLACE FUNCTION update_thread_last_message_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE message_threads
  SET last_message_at = NEW.created_at
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 11: Create trigger to auto-update last_message_at
DROP TRIGGER IF EXISTS update_thread_on_new_message ON messages;
CREATE TRIGGER update_thread_on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_last_message_at();

-- Step 12: Grant permissions
GRANT ALL ON message_threads TO authenticated;
GRANT ALL ON messages TO authenticated;
GRANT USAGE ON SEQUENCE message_threads_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE messages_id_seq TO authenticated;

-- Step 13: Enable realtime for messaging tables
ALTER PUBLICATION supabase_realtime ADD TABLE message_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Final verification
DO $$
DECLARE
  message_threads_exists BOOLEAN;
  messages_exists BOOLEAN;
  deleted_at_exists BOOLEAN;
  read_by_is_array BOOLEAN;
BEGIN
  -- Check if message_threads exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'message_threads'
  ) INTO message_threads_exists;

  -- Check if messages exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'messages'
  ) INTO messages_exists;

  -- Check if deleted_at column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'deleted_at'
  ) INTO deleted_at_exists;

  -- Check if read_by is an array
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages'
    AND column_name = 'read_by'
    AND data_type = 'ARRAY'
  ) INTO read_by_is_array;

  RAISE NOTICE '';
  RAISE NOTICE '===== MESSAGING SYSTEM SETUP RESULTS =====';
  RAISE NOTICE 'message_threads table exists: %', message_threads_exists;
  RAISE NOTICE 'messages table exists: %', messages_exists;
  RAISE NOTICE 'messages.deleted_at column exists: %', deleted_at_exists;
  RAISE NOTICE 'messages.read_by is array: %', read_by_is_array;
  RAISE NOTICE '';

  IF message_threads_exists AND messages_exists AND deleted_at_exists AND read_by_is_array THEN
    RAISE NOTICE '✅ SUCCESS! Messaging tables are properly configured!';
    RAISE NOTICE '';
    RAISE NOTICE 'The messaging system is now ready to use.';
    RAISE NOTICE 'You can now send and receive messages in your app.';
  ELSE
    RAISE WARNING '⚠️ Some issues may remain. Please check the results above.';
  END IF;
END $$;

-- Display final table structure
SELECT
  'message_threads' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'message_threads'
UNION ALL
SELECT
  'messages' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'messages'
ORDER BY table_name, column_name;