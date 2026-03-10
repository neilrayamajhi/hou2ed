-- ============================================================================
-- SECURITY FIXES
-- Date: 2026-02-17
-- Applied manually via Supabase SQL editor in two parts
-- ============================================================================
-- Fixes:
--   1. Anon users could read ALL profiles rows (names, phones, emails, etc.)
--   2. Anon role had GRANT ALL (insert/update/delete) on every table
--   3. Authenticated users could see ALL block relationships (not just their own)
--   4. Message attachment storage policies referenced wrong column names
--      (participant1_id / participant2_id instead of participant_ids array)
--   5. Admin policies in message attachments used wrong column (user_id vs id)
-- ============================================================================

-- ============================================================================
-- PART 1: Critical security fixes
-- ============================================================================

-- FIX 1: Remove blanket GRANT ALL for anon, give only what's needed
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
GRANT SELECT ON public.listings TO anon;
GRANT SELECT ON public.geocoding_cache TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- FIX 2: Remove policy that exposed all profile data to anyone
DROP POLICY IF EXISTS "Allow username to email lookup for login" ON public.profiles;

CREATE OR REPLACE FUNCTION public.get_email_from_username(p_username TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_email TEXT;
BEGIN
  SELECT email INTO v_email FROM public.profiles WHERE username = p_username LIMIT 1;
  RETURN v_email;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_email_from_username(TEXT) TO anon, authenticated;

-- FIX 3: Remove blocks policy that exposed everyone's block list
DROP POLICY IF EXISTS "Allow checking blocks for applications" ON public.blocks;

-- ============================================================================
-- PART 2: Message attachment storage policies
-- Note: helper functions must be in public schema, not storage schema
-- (storage schema is locked by Supabase)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_thread_id_from_path(object_path text)
RETURNS uuid AS $$
BEGIN
  RETURN (string_to_array(object_path, '/'))[1]::uuid;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.get_user_id_from_path(object_path text)
RETURNS uuid AS $$
BEGIN
  RETURN (string_to_array(object_path, '/'))[2]::uuid;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

DROP POLICY IF EXISTS "Users can upload attachments to their threads" ON storage.objects;
DROP POLICY IF EXISTS "Users can view attachments in their threads" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own attachments" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all attachments" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete any attachments" ON storage.objects;

CREATE POLICY "Users can upload attachments to their threads"
    ON storage.objects FOR INSERT WITH CHECK (
        bucket_id = 'message-attachments' AND auth.uid() IS NOT NULL
        AND public.get_user_id_from_path(name) = auth.uid()
        AND EXISTS (SELECT 1 FROM public.message_threads
            WHERE id = public.get_thread_id_from_path(name)
            AND auth.uid() = ANY(participant_ids)));

CREATE POLICY "Users can view attachments in their threads"
    ON storage.objects FOR SELECT USING (
        bucket_id = 'message-attachments' AND auth.uid() IS NOT NULL
        AND EXISTS (SELECT 1 FROM public.message_threads
            WHERE id = public.get_thread_id_from_path(name)
            AND auth.uid() = ANY(participant_ids)));

CREATE POLICY "Users can update their own attachments"
    ON storage.objects FOR UPDATE USING (
        bucket_id = 'message-attachments' AND auth.uid() IS NOT NULL
        AND public.get_user_id_from_path(name) = auth.uid()
        AND EXISTS (SELECT 1 FROM public.message_threads
            WHERE id = public.get_thread_id_from_path(name)
            AND auth.uid() = ANY(participant_ids)));

CREATE POLICY "Users can delete their own attachments"
    ON storage.objects FOR DELETE USING (
        bucket_id = 'message-attachments' AND auth.uid() IS NOT NULL
        AND public.get_user_id_from_path(name) = auth.uid()
        AND EXISTS (SELECT 1 FROM public.message_threads
            WHERE id = public.get_thread_id_from_path(name)
            AND auth.uid() = ANY(participant_ids)));

CREATE POLICY "Admins can view all attachments"
    ON storage.objects FOR SELECT USING (
        bucket_id = 'message-attachments'
        AND EXISTS (SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete any attachments"
    ON storage.objects FOR DELETE USING (
        bucket_id = 'message-attachments'
        AND EXISTS (SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'));
