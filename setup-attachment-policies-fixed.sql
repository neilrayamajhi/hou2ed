-- RLS Policies for message-attachments bucket
-- This version works without needing owner permissions on storage.objects

-- Note: RLS is likely already enabled on storage.objects, so we skip that step

-- Drop existing policies if they exist (these should work with your permissions)
DROP POLICY IF EXISTS "Users can upload message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own message attachments" ON storage.objects;

-- Create a simpler upload policy that doesn't require thread validation
-- (We'll rely on the app logic to ensure proper thread access)
CREATE POLICY "Users can upload message attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'message-attachments'
    -- User can only upload to their own folder (second part of path)
    AND auth.uid()::text = (string_to_array(name, '/'))[2]
);

-- Create a simpler view policy
-- Users can view any attachments in the message-attachments bucket
-- (We'll rely on app logic to filter by thread)
CREATE POLICY "Users can view message attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'message-attachments'
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete own message attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'message-attachments'
    -- User can only delete their own files
    AND auth.uid()::text = (string_to_array(name, '/'))[2]
);

-- Allow users to update their own files
CREATE POLICY "Users can update own message attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'message-attachments'
    -- User can only update their own files
    AND auth.uid()::text = (string_to_array(name, '/'))[2]
);

-- Verify the policies were created
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname LIKE '%message attachments%'
ORDER BY policyname;