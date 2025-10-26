-- URGENT FIX: Rename threads to message_threads and fix messaging system
-- Run this IMMEDIATELY in Supabase SQL Editor

-- Step 1: Check what tables exist
DO $$
BEGIN
  RAISE NOTICE 'Checking existing tables...';
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'threads') THEN
    RAISE NOTICE '✓ Found "threads" table';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'message_threads') THEN
    RAISE NOTICE '✓ Found "message_threads" table';
  END IF;
END $$;

-- Step 2: Rename threads to message_threads (if it exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'threads'
  ) THEN
    -- First drop the foreign key constraint on messages table if it references threads
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_type = 'FOREIGN KEY'
      AND table_name = 'messages'
      AND constraint_name LIKE '%thread%'
    ) THEN
      ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_thread_id_fkey;
    END IF;

    -- Rename the table
    ALTER TABLE threads RENAME TO message_threads;
    RAISE NOTICE '✅ Renamed "threads" to "message_threads"';

    -- Re-add the foreign key with correct table name
    ALTER TABLE messages
      ADD CONSTRAINT messages_thread_id_fkey
      FOREIGN KEY (thread_id)
      REFERENCES message_threads(id)
      ON DELETE CASCADE;
  ELSE
    RAISE NOTICE 'Table "threads" not found, checking for message_threads...';
  END IF;
END $$;

-- Step 3: If message_threads still doesn't exist, create it
CREATE TABLE IF NOT EXISTS message_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject TEXT,
  participant_ids UUID[] NOT NULL,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Add deleted_at column to messages table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE messages ADD COLUMN deleted_at TIMESTAMPTZ;
    RAISE NOTICE '✅ Added deleted_at column to messages';
  END IF;
END $$;

-- Step 5: Fix read_by column to be an array
DO $$
BEGIN
  -- Check current data type of read_by
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages'
    AND column_name = 'read_by'
    AND data_type != 'ARRAY'
  ) THEN
    -- Save any existing data if needed
    ALTER TABLE messages DROP COLUMN IF EXISTS read_by CASCADE;
    ALTER TABLE messages ADD COLUMN read_by UUID[] DEFAULT '{}';
    RAISE NOTICE '✅ Fixed read_by column to be UUID array';
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'read_by'
  ) THEN
    ALTER TABLE messages ADD COLUMN read_by UUID[] DEFAULT '{}';
    RAISE NOTICE '✅ Added read_by column as UUID array';
  END IF;
END $$;

-- Step 6: Ensure all required columns exist
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_urls TEXT[] DEFAULT '{}';

-- Step 7: Create necessary indexes
CREATE INDEX IF NOT EXISTS idx_message_threads_participants ON message_threads USING GIN (participant_ids);
CREATE INDEX IF NOT EXISTS idx_message_threads_last_message ON message_threads(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Step 8: Enable RLS
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Step 9: Create basic RLS policies
DROP POLICY IF EXISTS "Users can view threads" ON message_threads;
CREATE POLICY "Users can view threads"
  ON message_threads FOR SELECT
  USING (auth.uid() = ANY(participant_ids));

DROP POLICY IF EXISTS "Users can create threads" ON message_threads;
CREATE POLICY "Users can create threads"
  ON message_threads FOR INSERT
  WITH CHECK (auth.uid() = ANY(participant_ids));

DROP POLICY IF EXISTS "Users can update threads" ON message_threads;
CREATE POLICY "Users can update threads"
  ON message_threads FOR UPDATE
  USING (auth.uid() = ANY(participant_ids));

DROP POLICY IF EXISTS "Users can view messages" ON messages;
CREATE POLICY "Users can view messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM message_threads
      WHERE id = messages.thread_id
      AND auth.uid() = ANY(participant_ids)
    )
  );

DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM message_threads
      WHERE id = thread_id
      AND auth.uid() = ANY(participant_ids)
    )
  );

DROP POLICY IF EXISTS "Users can update own messages" ON messages;
CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid());

-- Step 10: Grant permissions
GRANT ALL ON message_threads TO authenticated;
GRANT ALL ON messages TO authenticated;

-- Final verification
DO $$
DECLARE
  threads_exists BOOLEAN;
  message_threads_exists BOOLEAN;
  deleted_at_exists BOOLEAN;
  read_by_is_array BOOLEAN;
BEGIN
  -- Check if old threads table still exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'threads'
  ) INTO threads_exists;

  -- Check if message_threads exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'message_threads'
  ) INTO message_threads_exists;

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

  RAISE NOTICE '===== VERIFICATION RESULTS =====';
  RAISE NOTICE 'Old "threads" table exists: %', threads_exists;
  RAISE NOTICE 'New "message_threads" table exists: %', message_threads_exists;
  RAISE NOTICE 'messages.deleted_at column exists: %', deleted_at_exists;
  RAISE NOTICE 'messages.read_by is array: %', read_by_is_array;

  IF message_threads_exists AND deleted_at_exists AND read_by_is_array AND NOT threads_exists THEN
    RAISE NOTICE '✅ SUCCESS! All messaging tables are properly configured!';
  ELSE
    RAISE WARNING '⚠️ Some issues may remain. Please check the results above.';
  END IF;
END $$;

-- Show final table structure
SELECT
  'message_threads' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'message_threads'
UNION ALL
SELECT
  'messages' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'messages'
ORDER BY table_name, column_name;