-- Simple RLS fix - one statement at a time

-- First, drop all existing policies
DROP POLICY IF EXISTS "seekers_view_own_applications" ON applications;
DROP POLICY IF EXISTS "seekers_create_applications" ON applications;
DROP POLICY IF EXISTS "seekers_update_draft_applications" ON applications;
DROP POLICY IF EXISTS "providers_view_applications" ON applications;
DROP POLICY IF EXISTS "providers_update_applications" ON applications;
DROP POLICY IF EXISTS "Seekers can view own applications" ON applications;
DROP POLICY IF EXISTS "Seekers can create applications" ON applications;
DROP POLICY IF EXISTS "Seekers can update own draft applications" ON applications;
DROP POLICY IF EXISTS "Providers can view applications for their listings" ON applications;
DROP POLICY IF EXISTS "Providers can update application status" ON applications;
DROP POLICY IF EXISTS "applications_insert_policy" ON applications;
DROP POLICY IF EXISTS "applications_select_own_policy" ON applications;
DROP POLICY IF EXISTS "applications_update_own_policy" ON applications;
DROP POLICY IF EXISTS "applications_select_provider_policy" ON applications;
DROP POLICY IF EXISTS "applications_update_provider_policy" ON applications;
DROP POLICY IF EXISTS "applications_delete_own_policy" ON applications;

-- Enable RLS
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON applications TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create a single, simple INSERT policy for seekers
CREATE POLICY "simple_seeker_insert"
    ON applications
    FOR INSERT
    TO authenticated
    WITH CHECK (seeker_id = auth.uid());

-- Create a simple SELECT policy
CREATE POLICY "simple_seeker_select"
    ON applications
    FOR SELECT
    TO authenticated
    USING (seeker_id = auth.uid());

-- Create a simple UPDATE policy
CREATE POLICY "simple_seeker_update"
    ON applications
    FOR UPDATE
    TO authenticated
    USING (seeker_id = auth.uid())
    WITH CHECK (seeker_id = auth.uid());