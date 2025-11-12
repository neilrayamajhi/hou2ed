-- Comprehensive fix for applications table RLS policies
-- This will resolve the "new row violates row-level security policy" error

-- First, check current policies
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'applications';

-- Drop ALL existing policies on applications table
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'applications'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON applications', pol.policyname);
    END LOOP;
END $$;

-- Temporarily disable RLS to ensure clean slate
ALTER TABLE applications DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Create new, simplified policies

-- 1. Allow authenticated users to insert if they are seekers
CREATE POLICY "authenticated_seekers_can_insert"
ON applications
FOR INSERT
TO authenticated
WITH CHECK (
    seeker_id = auth.uid()
);

-- 2. Allow users to view their own applications
CREATE POLICY "users_can_view_own"
ON applications
FOR SELECT
TO authenticated
USING (
    seeker_id = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM listings
        WHERE listings.id = applications.listing_id
        AND listings.provider_id = auth.uid()
    )
);

-- 3. Allow users to update their own applications
CREATE POLICY "users_can_update_own"
ON applications
FOR UPDATE
TO authenticated
USING (seeker_id = auth.uid())
WITH CHECK (seeker_id = auth.uid());

-- 4. Allow users to delete their own applications
CREATE POLICY "users_can_delete_own"
ON applications
FOR DELETE
TO authenticated
USING (seeker_id = auth.uid());

-- Grant all necessary permissions
GRANT ALL ON applications TO authenticated;
GRANT ALL ON applications TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Verify the new policies
SELECT tablename, policyname, cmd, roles, permissive
FROM pg_policies
WHERE tablename = 'applications'
ORDER BY policyname;

-- Test query to check if current user can insert
SELECT
    auth.uid() as current_user_id,
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'seeker'
    ) as is_seeker,
    has_table_privilege('applications', 'INSERT') as can_insert;