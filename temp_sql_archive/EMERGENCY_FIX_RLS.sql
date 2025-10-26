-- EMERGENCY FIX: Allow providers to update their listings
-- This is a minimal fix to get deletion working ASAP

-- Option 1: Temporarily disable RLS on listings (NOT RECOMMENDED FOR PRODUCTION)
-- Uncomment ONLY if you need immediate fix for testing:
-- ALTER TABLE listings DISABLE ROW LEVEL SECURITY;

-- Option 2: Create permissive policy (RECOMMENDED)
-- First, enable RLS if not already enabled
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies that might conflict
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'listings')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON listings', r.policyname);
    END LOOP;
END $$;

-- Create a PERMISSIVE policy for providers to SELECT their own listings
CREATE POLICY "providers_select_policy"
ON listings
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (provider_id = auth.uid() OR is_active = true);

-- Create a PERMISSIVE policy for providers to INSERT listings
CREATE POLICY "providers_insert_policy"
ON listings
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (provider_id = auth.uid());

-- Create a PERMISSIVE policy for providers to UPDATE their own listings
-- This is the KEY policy for deletion
CREATE POLICY "providers_update_policy"
ON listings
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (provider_id = auth.uid())
WITH CHECK (provider_id = auth.uid());

-- Create a PERMISSIVE policy for providers to DELETE their own listings
-- Just in case we want hard deletes later
CREATE POLICY "providers_delete_policy"
ON listings
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (provider_id = auth.uid());

-- Verify all policies are created
SELECT
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies
WHERE tablename = 'listings'
ORDER BY cmd;

-- Test: Check if auth.uid() is working
SELECT auth.uid() as current_user_id;

-- If the above returns a user ID, you're authenticated correctly
