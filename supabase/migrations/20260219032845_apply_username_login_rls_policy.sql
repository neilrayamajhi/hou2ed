-- ============================================================================
-- FIX: Allow username lookup during login (Idempotent version)
-- ============================================================================
-- Problem: Users cannot log in with username because anon role cannot
--          query profiles table to resolve username ’ email
-- Solution: Add RLS policy allowing anon to read profiles for username lookup
-- Date: 2026-02-11
-- ============================================================================

-- Drop the policy if it already exists (idempotent)
DROP POLICY IF EXISTS "Allow username to email lookup for login" ON public.profiles;

-- Create the policy
-- This allows unauthenticated users to query profiles for username’email resolution
CREATE POLICY "Allow username to email lookup for login"
    ON public.profiles
    FOR SELECT
    TO anon
    USING (true);

-- Add documentation
COMMENT ON POLICY "Allow username to email lookup for login" ON public.profiles IS
  'Allows unauthenticated users to resolve usernames to emails during login. Required for username-based login flow.';

-- Verify the policy was created
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'profiles'
        AND policyname = 'Allow username to email lookup for login'
    ) THEN
        RAISE NOTICE ' RLS policy "Allow username to email lookup for login" created successfully';
    ELSE
        RAISE EXCEPTION ' Failed to create RLS policy';
    END IF;
END $$;
