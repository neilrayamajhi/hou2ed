-- ============================================
-- MESSAGE ATTACHMENTS BUCKET AND RLS POLICIES
-- ============================================

-- Create message attachments bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'message-attachments',
    'message-attachments',
    false, -- Private bucket - requires auth to access
    10485760, -- 10MB limit
    ARRAY[
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
) ON CONFLICT (id) DO UPDATE
SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================
-- RLS POLICIES FOR MESSAGE ATTACHMENTS
-- ============================================

-- Helper function to extract thread ID from storage path
-- Path format: threadId/userId/timestamp-random.extension
CREATE OR REPLACE FUNCTION storage.get_thread_id_from_path(object_path text)
RETURNS uuid AS $$
BEGIN
    -- Extract the first folder (threadId) from the path
    RETURN (string_to_array(object_path, '/'))[1]::uuid;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper function to extract user ID from storage path
CREATE OR REPLACE FUNCTION storage.get_user_id_from_path(object_path text)
RETURNS uuid AS $$
BEGIN
    -- Extract the second folder (userId) from the path
    RETURN (string_to_array(object_path, '/'))[2]::uuid;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Policy: Users can upload attachments to threads they're participants in
CREATE POLICY "Users can upload attachments to their threads"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'message-attachments'
        AND auth.uid() IS NOT NULL
        AND storage.get_user_id_from_path(name) = auth.uid()
        AND EXISTS (
            SELECT 1 FROM message_threads
            WHERE id = storage.get_thread_id_from_path(name)
            AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
        )
    );

-- Policy: Users can view attachments in threads they're participants in
CREATE POLICY "Users can view attachments in their threads"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'message-attachments'
        AND auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM message_threads
            WHERE id = storage.get_thread_id_from_path(name)
            AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
        )
    );

-- Policy: Users can update their own attachments
CREATE POLICY "Users can update their own attachments"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'message-attachments'
        AND auth.uid() IS NOT NULL
        AND storage.get_user_id_from_path(name) = auth.uid()
        AND EXISTS (
            SELECT 1 FROM message_threads
            WHERE id = storage.get_thread_id_from_path(name)
            AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
        )
    );

-- Policy: Users can delete their own attachments
CREATE POLICY "Users can delete their own attachments"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'message-attachments'
        AND auth.uid() IS NOT NULL
        AND storage.get_user_id_from_path(name) = auth.uid()
        AND EXISTS (
            SELECT 1 FROM message_threads
            WHERE id = storage.get_thread_id_from_path(name)
            AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
        )
    );

-- Policy: Admins can view all attachments
CREATE POLICY "Admins can view all attachments"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'message-attachments'
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    );

-- Policy: Admins can delete any attachments
CREATE POLICY "Admins can delete any attachments"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'message-attachments'
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    );