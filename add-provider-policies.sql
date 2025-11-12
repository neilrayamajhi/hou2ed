-- Add RLS policies for providers to view applications for their listings

-- First, check and drop any existing provider policies
DROP POLICY IF EXISTS "providers_view_applications" ON applications;
DROP POLICY IF EXISTS "providers_select_applications" ON applications;
DROP POLICY IF EXISTS "provider_view_listing_applications" ON applications;

-- Create policy: Providers can view applications for their listings
CREATE POLICY "provider_view_listing_applications"
    ON applications
    FOR SELECT
    TO authenticated
    USING (
        -- Allow if the user is the provider of the listing
        EXISTS (
            SELECT 1
            FROM listings
            WHERE listings.id = applications.listing_id
            AND listings.provider_id = auth.uid()
        )
    );

-- Create policy: Providers can update applications for their listings (approve/reject)
DROP POLICY IF EXISTS "provider_update_listing_applications" ON applications;

CREATE POLICY "provider_update_listing_applications"
    ON applications
    FOR UPDATE
    TO authenticated
    USING (
        -- Can only update if they own the listing
        EXISTS (
            SELECT 1
            FROM listings
            WHERE listings.id = applications.listing_id
            AND listings.provider_id = auth.uid()
        )
    )
    WITH CHECK (
        -- Can only update if they own the listing
        EXISTS (
            SELECT 1
            FROM listings
            WHERE listings.id = applications.listing_id
            AND listings.provider_id = auth.uid()
        )
    );

-- Also ensure the provider's profile has the right role
-- Update the provider's role if needed (they might be set as 'seeker')
UPDATE profiles
SET role = 'provider'
WHERE id = 'c5019ab8-dba5-41b7-89fa-c7b23da81af6'
AND role != 'provider';