-- Check what RLS policies are actually applied to profiles table
-- Run this in Supabase SQL Editor to diagnose the seeker marketplace hang

SELECT
  policyname,
  cmd,
  qual::text as using_clause,
  with_check::text as with_check_clause
FROM pg_policies
WHERE tablename = 'profiles';

-- Also check if RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'profiles';
