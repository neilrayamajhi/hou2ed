-- EMERGENCY FIX: Complete reset of applications table RLS policies
-- This will remove ALL existing policies and create new working ones

-- Step 1: Drop ALL existing policies on applications table
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'applications'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON applications', pol.policyname);
    END LOOP;
END $$;

-- Step 2: Ensure RLS is enabled
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Step 3: Grant proper permissions to authenticated users
GRANT ALL ON applications TO authenticated;
GRANT ALL ON applications TO anon;
GRANT USAGE ON SEQUENCE applications_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE applications_id_seq TO anon;

-- Step 4: Create new simplified policies

-- Policy 1: Allow authenticated users with seeker role to INSERT
CREATE POLICY "applications_insert_policy"
    ON applications
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- User must have seeker role
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'seeker'
        )
        -- And seeker_id must match their auth id
        AND seeker_id = auth.uid()
    );

-- Policy 2: Allow seekers to SELECT their own applications
CREATE POLICY "applications_select_own_policy"
    ON applications
    FOR SELECT
    TO authenticated
    USING (
        seeker_id = auth.uid()
    );

-- Policy 3: Allow seekers to UPDATE their own applications
CREATE POLICY "applications_update_own_policy"
    ON applications
    FOR UPDATE
    TO authenticated
    USING (seeker_id = auth.uid())
    WITH CHECK (seeker_id = auth.uid());

-- Policy 4: Allow providers to SELECT applications for their listings
CREATE POLICY "applications_select_provider_policy"
    ON applications
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.listings
            WHERE listings.id = applications.listing_id
            AND listings.provider_id = auth.uid()
        )
    );

-- Policy 5: Allow providers to UPDATE applications for their listings
CREATE POLICY "applications_update_provider_policy"
    ON applications
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.listings
            WHERE listings.id = applications.listing_id
            AND listings.provider_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.listings
            WHERE listings.id = applications.listing_id
            AND listings.provider_id = auth.uid()
        )
    );

-- Step 5: Add a DELETE policy for seekers to delete their draft applications
CREATE POLICY "applications_delete_own_policy"
    ON applications
    FOR DELETE
    TO authenticated
    USING (
        seeker_id = auth.uid()
        AND status IN ('draft', 'new')
    );

-- Step 6: Verify the policies were created
DO $$
DECLARE
    policy_count int;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'applications';

    RAISE NOTICE 'Created % policies on applications table', policy_count;
END $$;

-- Step 7: Add helpful comments
COMMENT ON TABLE applications IS 'Housing applications with RLS policies allowing seekers to create/manage their own applications and providers to view/update applications for their listings';