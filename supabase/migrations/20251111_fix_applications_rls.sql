-- Fix RLS policies for applications table to work with the profiles structure
-- The issue is that seeker_id should match auth.uid() directly
-- since users with 'seeker' role in profiles table are the ones creating applications

-- Drop existing policies
DROP POLICY IF EXISTS "Seekers can view own applications" ON applications;
DROP POLICY IF EXISTS "Seekers can create applications" ON applications;
DROP POLICY IF EXISTS "Seekers can update own draft applications" ON applications;
DROP POLICY IF EXISTS "Providers can view applications for their listings" ON applications;
DROP POLICY IF EXISTS "Providers can update application status" ON applications;

-- Recreate policies with proper checks

-- 1. Seekers can view their own applications
CREATE POLICY "seekers_view_own_applications"
    ON applications FOR SELECT
    USING (
        seeker_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'seeker'
        )
    );

-- 2. Seekers can create applications (must be a seeker role)
CREATE POLICY "seekers_create_applications"
    ON applications FOR INSERT
    WITH CHECK (
        seeker_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'seeker'
        )
    );

-- 3. Seekers can update their own draft applications
CREATE POLICY "seekers_update_draft_applications"
    ON applications FOR UPDATE
    USING (
        seeker_id = auth.uid()
        AND status IN ('draft', 'new')
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'seeker'
        )
    )
    WITH CHECK (
        seeker_id = auth.uid()
        AND status IN ('draft', 'new', 'submitted')
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'seeker'
        )
    );

-- 4. Providers can view applications for their listings
CREATE POLICY "providers_view_applications"
    ON applications FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM listings
            WHERE listings.id = applications.listing_id
            AND listings.provider_id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'provider'
        )
    );

-- 5. Providers can update application status for their listings
CREATE POLICY "providers_update_applications"
    ON applications FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM listings
            WHERE listings.id = applications.listing_id
            AND listings.provider_id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'provider'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM listings
            WHERE listings.id = applications.listing_id
            AND listings.provider_id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'provider'
        )
    );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON applications TO authenticated;
GRANT USAGE ON SEQUENCE applications_id_seq TO authenticated;

-- Add helpful comment
COMMENT ON TABLE applications IS 'Housing applications submitted by seekers for provider listings';