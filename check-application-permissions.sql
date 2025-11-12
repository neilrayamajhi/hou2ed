-- Diagnostic queries to understand why applications insert is failing

-- 1. Check if RLS is enabled
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'applications';

-- 2. List all current policies on applications table
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
WHERE tablename = 'applications'
ORDER BY policyname;

-- 3. Check current user information
SELECT
    auth.uid() as auth_user_id,
    auth.role() as auth_role,
    auth.email() as auth_email;

-- 4. Check if current user exists in profiles and their role
SELECT
    id,
    email,
    role,
    full_name
FROM profiles
WHERE id = auth.uid();

-- 5. Check table permissions
SELECT
    has_table_privilege('applications', 'INSERT') as can_insert,
    has_table_privilege('applications', 'SELECT') as can_select,
    has_table_privilege('applications', 'UPDATE') as can_update,
    has_table_privilege('applications', 'DELETE') as can_delete;

-- 6. Check if the issue is with foreign key constraints
SELECT
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS foreign_table_name,
    a.attname AS column_name,
    af.attname AS foreign_column_name
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE c.contype = 'f'
AND c.conrelid = 'applications'::regclass;

-- 7. Try to understand what exact check is failing
-- This simulates what would happen with an insert
WITH test_insert AS (
    SELECT
        auth.uid() as test_seeker_id,
        'test-listing-id'::uuid as test_listing_id
)
SELECT
    test_seeker_id,
    test_listing_id,
    test_seeker_id = auth.uid() as "seeker_id matches auth.uid()",
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'seeker'
    ) as "user has seeker role",
    EXISTS (
        SELECT 1 FROM listings
        WHERE id = 'test-listing-id'::uuid
    ) as "listing exists (will be false for test)"
FROM test_insert;