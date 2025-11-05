-- Fix messages table to allow nullable application_id for general messaging
-- This migration ensures the messaging system can work for direct messages between users
-- not just application-specific messages

-- Step 1: Check if application_id column exists and make it nullable
DO $$
BEGIN
  -- Check if the column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages'
    AND column_name = 'application_id'
    AND table_schema = 'public'
  ) THEN
    -- Make the column nullable
    ALTER TABLE public.messages
    ALTER COLUMN application_id DROP NOT NULL;
    RAISE NOTICE 'Made application_id column nullable in messages table';
  ELSE
    -- Add the column if it doesn't exist (as nullable)
    ALTER TABLE public.messages
    ADD COLUMN application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added application_id column as nullable to messages table';
  END IF;
END $$;

-- Step 2: Add the RPC function for batch updating read receipts
-- This optimizes the N+1 query issue when marking multiple messages as read
CREATE OR REPLACE FUNCTION public.add_user_to_read_by(
  p_message_ids UUID[],
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
  -- Update messages to add user to read_by array
  -- array_remove ensures no duplicates, then array_append adds the user
  UPDATE public.messages
  SET
    read_by = array_append(
      array_remove(COALESCE(read_by, ARRAY[]::UUID[]), p_user_id),
      p_user_id
    ),
    updated_at = NOW()
  WHERE
    id = ANY(p_message_ids)
    AND NOT (p_user_id = ANY(COALESCE(read_by, ARRAY[]::UUID[])));
END;
$func$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.add_user_to_read_by(UUID[], UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.add_user_to_read_by(UUID[], UUID) IS
'Batch update function to mark multiple messages as read by a user. Prevents duplicates in read_by array.';

-- Step 3: Ensure updated_at column exists on messages (for tracking)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages'
    AND column_name = 'updated_at'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.messages
    ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added updated_at column to messages table';
  END IF;
END $$;

-- Create trigger function for updated_at if needed
CREATE OR REPLACE FUNCTION public.update_messages_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $func$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$func$;

-- Create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_messages_updated_at_trigger'
  ) THEN
    CREATE TRIGGER update_messages_updated_at_trigger
    BEFORE UPDATE ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_messages_updated_at();
    RAISE NOTICE 'Created updated_at trigger for messages table';
  END IF;
END $$;

-- Step 4: Create storage bucket for message attachments if it doesn't exist
DO $$
BEGIN
  -- Check if bucket exists
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets
    WHERE id = 'message-attachments'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit)
    VALUES (
      'message-attachments',
      'message-attachments',
      false, -- Private bucket
      10485760 -- 10MB limit
    );
    RAISE NOTICE 'Created message-attachments storage bucket';
  END IF;
END $$;

-- Step 5: Add storage policies for message attachments
-- Policy: Users can upload their own attachments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Users can upload message attachments'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can upload message attachments" ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = ''message-attachments'' AND
      auth.uid()::text = (storage.foldername(name))[2]
    )';
  END IF;
END $$;

-- Policy: Users can view attachments in their threads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Users can view message attachments'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view message attachments" ON storage.objects
    FOR SELECT
    USING (
      bucket_id = ''message-attachments'' AND
      EXISTS (
        SELECT 1 FROM public.message_threads mt
        JOIN public.messages m ON m.thread_id = mt.id
        WHERE auth.uid() = ANY(mt.participant_ids)
        AND (storage.foldername(name))[1] = mt.id::text
      )
    )';
  END IF;
END $$;

-- Policy: Users can delete their own attachments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Users can delete their message attachments'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can delete their message attachments" ON storage.objects
    FOR DELETE
    USING (
      bucket_id = ''message-attachments'' AND
      auth.uid()::text = (storage.foldername(name))[2]
    )';
  END IF;
END $$;

-- Step 6: Add helpful indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_messages_read_by ON public.messages USING GIN (read_by);
CREATE INDEX IF NOT EXISTS idx_messages_application_id ON public.messages(application_id)
  WHERE application_id IS NOT NULL;

-- Verification query to confirm the fix
DO $$
DECLARE
  v_is_nullable VARCHAR;
BEGIN
  SELECT is_nullable INTO v_is_nullable
  FROM information_schema.columns
  WHERE table_name = 'messages'
  AND column_name = 'application_id'
  AND table_schema = 'public';

  IF v_is_nullable = 'YES' THEN
    RAISE NOTICE 'SUCCESS: application_id is now nullable in messages table';
  ELSE
    RAISE WARNING 'WARNING: application_id is still NOT NULL - manual intervention may be needed';
  END IF;
END $$;