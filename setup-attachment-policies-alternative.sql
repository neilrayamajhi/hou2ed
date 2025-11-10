-- Alternative approach: Create RLS policies that work with existing permissions
-- Run this in the Supabase SQL editor

-- First, let's check if we can create policies at all
DO $$
BEGIN
    -- Try to create a simple test policy
    BEGIN
        CREATE POLICY "message_attachments_test_policy"
        ON storage.objects FOR SELECT
        TO authenticated
        USING (bucket_id = 'message-attachments');

        -- If successful, drop it immediately
        DROP POLICY "message_attachments_test_policy" ON storage.objects;

        RAISE NOTICE 'Success: Can create policies on storage.objects';
    EXCEPTION
        WHEN insufficient_privilege THEN
            RAISE NOTICE 'Error: Cannot create policies on storage.objects - need different approach';
        WHEN duplicate_object THEN
            RAISE NOTICE 'Policy already exists - dropping and continuing';
            DROP POLICY IF EXISTS "message_attachments_test_policy" ON storage.objects;
    END;
END $$;

-- Create policies with simpler names and logic
-- These should work even with limited permissions

-- Policy 1: Allow authenticated users to upload to message-attachments
CREATE POLICY "auth_users_upload_message_attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'message-attachments'
);

-- Policy 2: Allow authenticated users to view message-attachments
CREATE POLICY "auth_users_view_message_attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'message-attachments'
);

-- Policy 3: Allow authenticated users to delete from message-attachments
CREATE POLICY "auth_users_delete_message_attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'message-attachments'
);

-- Policy 4: Allow authenticated users to update message-attachments
CREATE POLICY "auth_users_update_message_attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'message-attachments'
);

-- Check what policies exist
SELECT
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname LIKE '%message_attachments%';