-- Fix Messaging Tables for HOU2ED App
-- This migration fixes the messaging system by:
-- 1. Renaming 'threads' table to 'message_threads' (if needed)
-- 2. Adding missing 'deleted_at' column to messages table
-- 3. Ensuring all required columns exist

-- ===============================================
-- Step 1: Check if we need to rename threads to message_threads
-- ===============================================
DO $$
BEGIN
  -- Check if 'threads' table exists but 'message_threads' doesn't
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'threads'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'message_threads'
  ) THEN
    -- Rename the table
    ALTER TABLE threads RENAME TO message_threads;
    RAISE NOTICE 'Renamed threads table to message_threads';
  END IF;
END $$;

-- ===============================================
-- Step 2: Create message_threads table if it doesn't exist
-- ===============================================
CREATE TABLE IF NOT EXISTS message_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject TEXT,
  participant_ids UUID[] NOT NULL,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT thread_reference CHECK (
    listing_id IS NOT NULL OR application_id IS NOT NULL
  )
);

-- ===============================================
-- Step 3: Add missing columns to messages table
-- ===============================================
DO $$
BEGIN
  -- Add deleted_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages'
    AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE messages ADD COLUMN deleted_at TIMESTAMPTZ;
    RAISE NOTICE 'Added deleted_at column to messages table';
  END IF;

  -- Ensure read_by column is an array
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages'
    AND column_name = 'read_by'
    AND data_type = 'ARRAY'
  ) THEN
    -- Drop the old column if it exists but isn't an array
    ALTER TABLE messages DROP COLUMN IF EXISTS read_by;
    ALTER TABLE messages ADD COLUMN read_by UUID[] DEFAULT '{}';
    RAISE NOTICE 'Fixed read_by column in messages table';
  END IF;

  -- Ensure attachment_urls is an array
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages'
    AND column_name = 'attachment_urls'
    AND data_type = 'ARRAY'
  ) THEN
    ALTER TABLE messages DROP COLUMN IF EXISTS attachment_urls;
    ALTER TABLE messages ADD COLUMN attachment_urls TEXT[] DEFAULT '{}';
    RAISE NOTICE 'Fixed attachment_urls column in messages table';
  END IF;

  -- Add thread_id column with proper reference
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages'
    AND column_name = 'thread_id'
  ) THEN
    ALTER TABLE messages ADD COLUMN thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added thread_id column to messages table';
  END IF;

  -- Add sender_id column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages'
    AND column_name = 'sender_id'
  ) THEN
    ALTER TABLE messages ADD COLUMN sender_id UUID NOT NULL REFERENCES profiles(id);
    RAISE NOTICE 'Added sender_id column to messages table';
  END IF;

  -- Add edited_at column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages'
    AND column_name = 'edited_at'
  ) THEN
    ALTER TABLE messages ADD COLUMN edited_at TIMESTAMPTZ;
    RAISE NOTICE 'Added edited_at column to messages table';
  END IF;
END $$;

-- ===============================================
-- Step 4: Create indexes for better performance
-- ===============================================
CREATE INDEX IF NOT EXISTS idx_message_threads_participants ON message_threads USING GIN (participant_ids);
CREATE INDEX IF NOT EXISTS idx_message_threads_listing_id ON message_threads(listing_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_application_id ON message_threads(application_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_last_message_at ON message_threads(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON messages(deleted_at) WHERE deleted_at IS NULL;

-- ===============================================
-- Step 5: Enable Row Level Security
-- ===============================================
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ===============================================
-- Step 6: Create RLS policies for message_threads
-- ===============================================
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Participants can view threads" ON message_threads;
DROP POLICY IF EXISTS "Users can create threads" ON message_threads;
DROP POLICY IF EXISTS "Participants can update threads" ON message_threads;

-- Participants can view their threads
CREATE POLICY "Participants can view threads"
  ON message_threads FOR SELECT
  USING (auth.uid() = ANY(participant_ids));

-- Users can create new threads
CREATE POLICY "Users can create threads"
  ON message_threads FOR INSERT
  WITH CHECK (auth.uid() = ANY(participant_ids));

-- Participants can update thread metadata
CREATE POLICY "Participants can update threads"
  ON message_threads FOR UPDATE
  USING (auth.uid() = ANY(participant_ids))
  WITH CHECK (auth.uid() = ANY(participant_ids));

-- ===============================================
-- Step 7: Create RLS policies for messages
-- ===============================================
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Participants can view messages" ON messages;
DROP POLICY IF EXISTS "Participants can send messages" ON messages;
DROP POLICY IF EXISTS "Senders can edit own messages" ON messages;
DROP POLICY IF EXISTS "Senders can delete own messages" ON messages;

-- Thread participants can view messages
CREATE POLICY "Participants can view messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM message_threads
      WHERE id = messages.thread_id
      AND auth.uid() = ANY(participant_ids)
    )
  );

-- Thread participants can send messages
CREATE POLICY "Participants can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM message_threads
      WHERE id = thread_id
      AND auth.uid() = ANY(participant_ids)
    )
  );

-- Senders can edit their own recent messages (within 24 hours)
CREATE POLICY "Senders can edit own recent messages"
  ON messages FOR UPDATE
  USING (
    sender_id = auth.uid()
    AND created_at > NOW() - INTERVAL '24 hours'
  )
  WITH CHECK (sender_id = auth.uid());

-- Senders can soft-delete their own messages
CREATE POLICY "Senders can delete own messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid())
  WITH CHECK (
    sender_id = auth.uid()
    -- Only allow updating deleted_at and edited_at fields
    AND (
      deleted_at IS NOT NULL
      OR edited_at IS NOT NULL
    )
  );

-- ===============================================
-- Step 8: Create trigger for updating timestamps
-- ===============================================
CREATE OR REPLACE FUNCTION update_message_thread_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE message_threads
  SET last_message_at = NEW.created_at
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_thread_timestamp_on_message'
  ) THEN
    CREATE TRIGGER update_thread_timestamp_on_message
      AFTER INSERT ON messages
      FOR EACH ROW
      EXECUTE FUNCTION update_message_thread_timestamp();
  END IF;
END $$;

-- ===============================================
-- Step 9: Grant necessary permissions
-- ===============================================
GRANT ALL ON message_threads TO authenticated;
GRANT ALL ON messages TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ===============================================
-- Verification Query - Run this to check if everything is set up correctly
-- ===============================================
DO $$
DECLARE
  issues TEXT := '';
BEGIN
  -- Check if message_threads table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'message_threads') THEN
    issues := issues || '- message_threads table does not exist' || E'\n';
  END IF;

  -- Check if messages table has deleted_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'deleted_at') THEN
    issues := issues || '- messages table is missing deleted_at column' || E'\n';
  END IF;

  -- Check if messages table has read_by array column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'read_by' AND data_type = 'ARRAY') THEN
    issues := issues || '- messages table read_by column is not an array' || E'\n';
  END IF;

  -- Report results
  IF issues = '' THEN
    RAISE NOTICE '✅ All messaging tables are correctly configured!';
  ELSE
    RAISE WARNING '⚠️ Issues found:' || E'\n' || '%', issues;
  END IF;
END $$;

-- ===============================================
-- Success message
-- ===============================================
SELECT 'Messaging tables migration completed successfully!' AS status;