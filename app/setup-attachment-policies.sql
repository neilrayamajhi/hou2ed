-- RLS Policies for message-attachments bucket
-- Run this SQL in the Supabase SQL editor:
-- https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/sql/new

-- First ensure RLS is enabled on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to recreate cleanly)
DROP POLICY IF EXISTS "Users can upload message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own message attachments" ON storage.objects;

-- Allow authenticated users to upload files to message-attachments bucket
-- Path format is: threadId/userId/filename
CREATE POLICY "Users can upload message attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'message-attachments'
    -- User can only upload to their own folder
    AND auth.uid()::text = (string_to_array(name, '/'))[2]
    -- And they must be a participant in the thread
    AND EXISTS (
        SELECT 1 FROM message_threads
        WHERE id = (string_to_array(name, '/'))[1]::uuid
        AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
    )
);

-- Allow authenticated users to view files in threads they're part of
CREATE POLICY "Users can view message attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'message-attachments'
    -- User must be a participant in the thread
    AND EXISTS (
        SELECT 1 FROM message_threads
        WHERE id = (string_to_array(name, '/'))[1]::uuid
        AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
    )
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete own message attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'message-attachments'
    -- User can only delete their own files
    AND auth.uid()::text = (string_to_array(name, '/'))[2]
    -- And they must be a participant in the thread
    AND EXISTS (
        SELECT 1 FROM message_threads
        WHERE id = (string_to_array(name, '/'))[1]::uuid
        AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
    )
);

-- Allow users to update their own files
CREATE POLICY "Users can update own message attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'message-attachments'
    -- User can only update their own files
    AND auth.uid()::text = (string_to_array(name, '/'))[2]
    -- And they must be a participant in the thread
    AND EXISTS (
        SELECT 1 FROM message_threads
        WHERE id = (string_to_array(name, '/'))[1]::uuid
        AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
    )
);

-- Verify the policies were created
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname LIKE '%message attachments%'
ORDER BY policyname;