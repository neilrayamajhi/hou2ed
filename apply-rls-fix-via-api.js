// Apply RLS fix via Supabase Management API
// This creates a simpler workaround that can be applied immediately

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hqxxaxlwfkznwndvgqya.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxeHhheGx3Zmt6bnduZHZncXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY2NzcxODAsImV4cCI6MjA0MjI1MzE4MH0.YzJaXIhoii0oO3B0m3sRBh70fG7pGwRoSC6j6u0KOAI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log(`
================================
RLS POLICY FIX FOR APPLICATIONS
================================

The error "new row violates row-level security policy for table applications"
means the database security rules are blocking the insert.

TO FIX THIS ISSUE:
==================

1. Go to Supabase Dashboard:
   https://supabase.com/dashboard/project/hqxxaxlwfkznwndvgqya/sql/new

2. Copy and paste this SQL:

-- Temporary fix: Create a simpler policy for testing
-- This allows any authenticated user with 'seeker' role to create applications

-- First, check if the user trying to submit is a seeker
-- Run this to see current policies:
SELECT * FROM pg_policies WHERE tablename = 'applications';

-- Drop the restrictive policy and create a more permissive one
DROP POLICY IF EXISTS "Seekers can create applications" ON applications;

CREATE POLICY "seekers_can_create_applications_simple"
    ON applications FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND seeker_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'seeker'
        )
    );

-- Also ensure the seeker can view their own applications after creation
DROP POLICY IF EXISTS "Seekers can view own applications" ON applications;

CREATE POLICY "seekers_can_view_own_applications_simple"
    ON applications FOR SELECT
    USING (
        seeker_id = auth.uid()
    );

-- Grant necessary permissions
GRANT ALL ON applications TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

3. Click "RUN" to execute the SQL

4. Test the application submission again

================================
ALTERNATIVE QUICK FIX:
================================

If the above doesn't work, try this more permissive temporary policy:

-- TEMPORARY: Very permissive policy for testing
DROP POLICY IF EXISTS "Seekers can create applications" ON applications;
DROP POLICY IF EXISTS "seekers_can_create_applications_simple" ON applications;

CREATE POLICY "allow_authenticated_insert_applications"
    ON applications FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "allow_authenticated_select_applications"
    ON applications FOR SELECT
    TO authenticated
    USING (true);

-- Remember to tighten security after testing!

================================
DEBUGGING STEPS:
================================

To debug, run these queries in the SQL editor:

1. Check current user:
   SELECT auth.uid(), auth.role();

2. Check user profile:
   SELECT * FROM profiles WHERE id = auth.uid();

3. Check existing policies:
   SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
   FROM pg_policies
   WHERE tablename = 'applications';

4. Test if insert would work without RLS:
   -- First disable RLS temporarily
   ALTER TABLE applications DISABLE ROW LEVEL SECURITY;

   -- Try insert
   INSERT INTO applications (listing_id, seeker_id, status)
   VALUES ('your-listing-id', auth.uid(), 'new');

   -- Re-enable RLS
   ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

================================
`);

console.log('Please apply the SQL fix above in the Supabase Dashboard.');
console.log('\nDashboard URL: https://supabase.com/dashboard/project/hqxxaxlwfkznwndvgqya/sql/new');