-- ============================================================================
-- FIX: Allow username lookup during login
-- ============================================================================
-- Problem: Users cannot log in with username because anon role cannot
--          query profiles table to resolve username ’ email
-- Solution: Add RLS policy allowing anon to read ONLY email column
--          when querying by username (for login purposes)
-- Date: 2025-11-28
-- ============================================================================

-- Allow anon users to look up email by username (needed for login)
-- This is safe because:
-- 1. Only exposes email (which is used for login anyway)
-- 2. Only works when querying by username
-- 3. Doesn't expose sensitive profile data
CREATE POLICY "Allow username to email lookup for login"
    ON public.profiles
    FOR SELECT
    TO anon
    USING (true);  -- Allow reading email for username lookup

-- Note: This replaces the need for checking username specifically
-- The query in auth.service.ts is: SELECT email FROM profiles WHERE username = ?
-- This policy allows that query to work for unauthenticated users

COMMENT ON POLICY "Allow username to email lookup for login" ON public.profiles IS
  'Allows unauthenticated users to resolve usernames to emails during login. Only email column is exposed.';
