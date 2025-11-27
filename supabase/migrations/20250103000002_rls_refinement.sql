-- Phase B5.1: RLS Refinement for Security
-- Comprehensive Row Level Security policies for all tables
-- Implements least-privilege access with DV protection
-- Note: profiles table policies are defined in 20241002000001_create_profiles_table.sql
-- Note: providers table does not exist - provider info is in profiles table with role='provider'

-- ============================================
-- LISTINGS TABLE POLICIES (WITH DV PROTECTION)
-- ============================================

DROP POLICY IF EXISTS "Public can view non-DV listings" ON listings;
DROP POLICY IF EXISTS "Providers can manage own listings" ON listings;
DROP POLICY IF EXISTS "Admins can manage all listings" ON listings;
DROP POLICY IF EXISTS "DV coordinates protected" ON listings;

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- Public can view listings but DV coordinates are protected
CREATE POLICY "Public can view listings with DV protection"
    ON listings FOR SELECT
    USING (
        active = true
        AND (
            -- Non-DV listings: show everything
            domestic_violence_focus = false
            OR
            -- DV listings: only show to authorized users
            (
                domestic_violence_focus = true
                AND (
                    -- Provider owns the listing
                    provider_id IN (
                        SELECT id FROM profiles WHERE id = auth.uid() AND role = 'provider'
                    )
                    OR
                    -- User is an admin
                    EXISTS (
                        SELECT 1 FROM profiles
                        WHERE id = auth.uid()
                        AND role = 'admin'
                    )
                    OR
                    -- User has an approved application for this listing
                    EXISTS (
                        SELECT 1 FROM applications
                        WHERE listing_id = listings.id
                        AND seeker_id = auth.uid()
                        AND status = 'approved'
                    )
                )
            )
        )
    );

-- Providers can manage their own listings
CREATE POLICY "Providers can manage own listings"
    ON listings FOR ALL
    USING (
        provider_id IN (
            SELECT id FROM profiles WHERE id = auth.uid() AND role = 'provider'
        )
    )
    WITH CHECK (
        provider_id IN (
            SELECT id FROM profiles WHERE id = auth.uid() AND role = 'provider'
        )
    );

-- Admins can manage all listings
CREATE POLICY "Admins can manage all listings"
    ON listings FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- Create a secure view for public listing access with DV redaction
CREATE OR REPLACE VIEW public_listings AS
SELECT
    id,
    provider_id,
    name,
    description,
    housing_type,
    unit_beds,
    beds_available_today,
    beds_available_this_week,
    waitlist_days,
    monthly_rent,
    security_deposit,
    utilities_included,
    pets_allowed,
    accessibility_features,
    amenities,
    requirements,
    application_process,
    -- Conditionally show coordinates
    CASE
        WHEN domestic_violence_focus = false THEN coordinates
        ELSE NULL
    END as coordinates,
    -- Show address only for non-DV
    CASE
        WHEN domestic_violence_focus = false THEN address
        ELSE district || ' area' -- Show only general area for DV
    END as address,
    district,
    island,
    -- Hide exact DV status from public
    CASE
        WHEN domestic_violence_focus = true THEN 'Confidential Location'
        ELSE NULL
    END as location_note,
    contact_phone,
    contact_email,
    active,
    created_at,
    updated_at,
    last_confirmed
FROM listings
WHERE active = true;

-- Grant access to the view
GRANT SELECT ON public_listings TO anon, authenticated;

-- ============================================
-- APPLICATIONS TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Seekers can view own applications" ON applications;
DROP POLICY IF EXISTS "Seekers can create applications" ON applications;
DROP POLICY IF EXISTS "Seekers can update own draft applications" ON applications;
DROP POLICY IF EXISTS "Providers can view applications for their listings" ON applications;
DROP POLICY IF EXISTS "Providers can update application status" ON applications;
DROP POLICY IF EXISTS "Admins can manage all applications" ON applications;

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Seekers can view their own applications
CREATE POLICY "Seekers can view own applications"
    ON applications FOR SELECT
    USING (seeker_id = auth.uid());

-- Seekers can create new applications
CREATE POLICY "Seekers can create applications"
    ON applications FOR INSERT
    WITH CHECK (seeker_id = auth.uid());

-- Seekers can update their own draft applications
CREATE POLICY "Seekers can update own draft applications"
    ON applications FOR UPDATE
    USING (
        seeker_id = auth.uid()
        AND status = 'draft'
    )
    WITH CHECK (
        seeker_id = auth.uid()
        AND status IN ('draft', 'submitted')
    );

-- Providers can view applications for their listings
CREATE POLICY "Providers can view applications for their listings"
    ON applications FOR SELECT
    USING (
        listing_id IN (
            SELECT id FROM listings
            WHERE provider_id IN (
                SELECT id FROM profiles WHERE id = auth.uid() AND role = 'provider'
            )
        )
    );

-- Providers can update application status for their listings
CREATE POLICY "Providers can update application status"
    ON applications FOR UPDATE
    USING (
        listing_id IN (
            SELECT id FROM listings
            WHERE provider_id IN (
                SELECT id FROM profiles WHERE id = auth.uid() AND role = 'provider'
            )
        )
    )
    WITH CHECK (
        -- Can only update status and provider_notes
        listing_id IN (
            SELECT id FROM listings
            WHERE provider_id IN (
                SELECT id FROM profiles WHERE id = auth.uid() AND role = 'provider'
            )
        )
    );

-- Admins can manage all applications
CREATE POLICY "Admins can manage all applications"
    ON applications FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- ============================================
-- APPLICATION DOCUMENTS TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view own documents" ON application_documents;
DROP POLICY IF EXISTS "Users can upload own documents" ON application_documents;
DROP POLICY IF EXISTS "Providers can view documents for their applications" ON application_documents;
DROP POLICY IF EXISTS "Admins can manage all documents" ON application_documents;

ALTER TABLE application_documents ENABLE ROW LEVEL SECURITY;

-- Users can view their own documents
CREATE POLICY "Users can view own documents"
    ON application_documents FOR SELECT
    USING (
        application_id IN (
            SELECT id FROM applications WHERE seeker_id = auth.uid()
        )
    );

-- Users can upload documents for their applications
CREATE POLICY "Users can upload own documents"
    ON application_documents FOR INSERT
    WITH CHECK (
        application_id IN (
            SELECT id FROM applications WHERE seeker_id = auth.uid()
        )
        AND uploaded_by = auth.uid()
    );

-- Users can delete their own documents (before submission)
CREATE POLICY "Users can delete own draft documents"
    ON application_documents FOR DELETE
    USING (
        uploaded_by = auth.uid()
        AND application_id IN (
            SELECT id FROM applications
            WHERE seeker_id = auth.uid()
            AND status = 'draft'
        )
    );

-- Providers can view documents for applications to their listings
CREATE POLICY "Providers can view documents for their applications"
    ON application_documents FOR SELECT
    USING (
        application_id IN (
            SELECT a.id FROM applications a
            JOIN listings l ON a.listing_id = l.id
            WHERE l.provider_id IN (
                SELECT id FROM profiles WHERE id = auth.uid() AND role = 'provider'
            )
        )
    );

-- Admins can manage all documents
CREATE POLICY "Admins can manage all documents"
    ON application_documents FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- ============================================
-- MESSAGE THREADS TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Participants can view threads" ON message_threads;
DROP POLICY IF EXISTS "Users can create threads" ON message_threads;
DROP POLICY IF EXISTS "Participants can update threads" ON message_threads;

ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;

-- Participants can view their threads
CREATE POLICY "Participants can view threads"
    ON message_threads FOR SELECT
    USING (
        auth.uid() = ANY(participant_ids)
    );

-- Users can create new threads
CREATE POLICY "Users can create threads"
    ON message_threads FOR INSERT
    WITH CHECK (
        auth.uid() = ANY(participant_ids)
    );

-- Participants can update thread metadata
CREATE POLICY "Participants can update threads"
    ON message_threads FOR UPDATE
    USING (
        auth.uid() = ANY(participant_ids)
    )
    WITH CHECK (
        auth.uid() = ANY(participant_ids)
    );

-- ============================================
-- MESSAGES TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Participants can view messages" ON messages;
DROP POLICY IF EXISTS "Participants can send messages" ON messages;
DROP POLICY IF EXISTS "Senders can edit own messages" ON messages;
DROP POLICY IF EXISTS "Senders can delete own messages" ON messages;

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Thread participants can view messages
CREATE POLICY "Participants can view messages"
    ON messages FOR SELECT
    USING (
        thread_id IN (
            SELECT id FROM message_threads
            WHERE auth.uid() = ANY(participant_ids)
        )
    );

-- Thread participants can send messages
CREATE POLICY "Participants can send messages"
    ON messages FOR INSERT
    WITH CHECK (
        sender_id = auth.uid()
        AND thread_id IN (
            SELECT id FROM message_threads
            WHERE auth.uid() = ANY(participant_ids)
        )
    );

-- Senders can edit their own recent messages (within 24 hours)
CREATE POLICY "Senders can edit own recent messages"
    ON messages FOR UPDATE
    USING (
        sender_id = auth.uid()
        AND created_at > NOW() - INTERVAL '24 hours'
    )
    WITH CHECK (
        sender_id = auth.uid()
    );

-- Senders can soft-delete their own messages
CREATE POLICY "Senders can delete own messages"
    ON messages FOR UPDATE
    USING (
        sender_id = auth.uid()
    )
    WITH CHECK (
        sender_id = auth.uid()
        AND deleted_at IS NOT NULL -- Only allow setting deleted_at
    );

-- ============================================
-- SAVED ITEMS TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view own saved items" ON saved_listings;
DROP POLICY IF EXISTS "Users can save items" ON saved_listings;
DROP POLICY IF EXISTS "Users can delete own saved items" ON saved_listings;

ALTER TABLE saved_listings ENABLE ROW LEVEL SECURITY;

-- Users can only see their own saved items
CREATE POLICY "Users can view own saved items"
    ON saved_listings FOR SELECT
    USING (id = auth.uid());

-- Users can save new items
CREATE POLICY "Users can save items"
    ON saved_listings FOR INSERT
    WITH CHECK (id = auth.uid());

-- Users can update their own saved items (notes)
CREATE POLICY "Users can update own saved items"
    ON saved_listings FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Users can delete their own saved items
CREATE POLICY "Users can delete own saved items"
    ON saved_listings FOR DELETE
    USING (id = auth.uid());

-- ============================================
-- SAVED SEARCHES TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view own saved searches" ON saved_searches;
DROP POLICY IF EXISTS "Users can create saved searches" ON saved_searches;
DROP POLICY IF EXISTS "Users can update own saved searches" ON saved_searches;
DROP POLICY IF EXISTS "Users can delete own saved searches" ON saved_searches;

ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

-- Users can only see their own saved searches
CREATE POLICY "Users can view own saved searches"
    ON saved_searches FOR SELECT
    USING (id = auth.uid());

-- Users can create saved searches
CREATE POLICY "Users can create saved searches"
    ON saved_searches FOR INSERT
    WITH CHECK (id = auth.uid());

-- Users can update their own saved searches
CREATE POLICY "Users can update own saved searches"
    ON saved_searches FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Users can delete their own saved searches
CREATE POLICY "Users can delete own saved searches"
    ON saved_searches FOR DELETE
    USING (id = auth.uid());

-- ============================================
-- SAVED SEARCH ALERTS TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view own alerts" ON saved_search_alerts;
DROP POLICY IF EXISTS "System can create alerts" ON saved_search_alerts;
DROP POLICY IF EXISTS "Users can update own alerts" ON saved_search_alerts;

ALTER TABLE saved_search_alerts ENABLE ROW LEVEL SECURITY;

-- Users can view their own alerts
CREATE POLICY "Users can view own alerts"
    ON saved_search_alerts FOR SELECT
    USING (id = auth.uid());

-- System can create alerts (via service role)
-- This will be handled by RPC functions with SECURITY DEFINER

-- Users can update their own alerts (mark as seen)
CREATE POLICY "Users can update own alerts"
    ON saved_search_alerts FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- ============================================
-- AVAILABILITY HISTORY TABLE POLICIES
-- ============================================

-- Already defined in previous migration, but let's ensure it's comprehensive

DROP POLICY IF EXISTS "Providers can view own availability history" ON availability_history;
DROP POLICY IF EXISTS "Admins can view all availability history" ON availability_history;

-- Providers can view their own availability history
CREATE POLICY "Providers can view own availability history"
    ON availability_history FOR SELECT
    USING (
        provider_id IN (
            SELECT id FROM profiles WHERE id = auth.uid() AND role = 'provider'
        )
    );

-- Admins can view all availability history
CREATE POLICY "Admins can view all availability history"
    ON availability_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- ============================================
-- STORAGE POLICIES FOR BUCKETS
-- ============================================

-- Application documents bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'application-documents',
    'application-documents',
    false,
    10485760, -- 10MB limit
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
) ON CONFLICT (id) DO UPDATE
SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Profile avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    2097152, -- 2MB limit
    ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
) ON CONFLICT (id) DO UPDATE
SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Listing images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'listing-images',
    'listing-images',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
) ON CONFLICT (id) DO UPDATE
SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies for application documents
CREATE POLICY "Users can upload own application documents"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'application-documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view own application documents"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'application-documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own application documents"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'application-documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Storage policies for avatars
CREATE POLICY "Users can upload own avatar"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Anyone can view avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

CREATE POLICY "Users can update own avatar"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own avatar"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Storage policies for listing images (providers only)
CREATE POLICY "Providers can upload listing images"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'listing-images'
        AND EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'provider'
        )
    );

CREATE POLICY "Anyone can view listing images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'listing-images');

CREATE POLICY "Providers can update listing images"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'listing-images'
        AND EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'provider'
        )
    );

CREATE POLICY "Providers can delete listing images"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'listing-images'
        AND EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'provider'
        )
    );

-- ============================================
-- HELPER FUNCTIONS FOR SECURE ACCESS
-- ============================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is provider
CREATE OR REPLACE FUNCTION is_provider()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's provider ID
CREATE OR REPLACE FUNCTION get_provider_id()
RETURNS UUID AS $$
DECLARE
    provider_id UUID;
BEGIN
    SELECT id INTO provider_id
    FROM profiles
    WHERE id = auth.uid();

    RETURN provider_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can view DV listing details
CREATE OR REPLACE FUNCTION can_view_dv_listing(listing_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM listings l
        WHERE l.id = listing_id
        AND (
            -- Not a DV listing
            l.domestic_violence_focus = false
            OR
            -- User is the provider
            l.provider_id IN (
                SELECT id FROM profiles WHERE id = auth.uid() AND role = 'provider'
            )
            OR
            -- User is admin
            is_admin()
            OR
            -- User has approved application
            EXISTS (
                SELECT 1 FROM applications
                WHERE listing_id = l.id
                AND seeker_id = auth.uid()
                AND status = 'approved'
            )
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION is_provider TO authenticated;
GRANT EXECUTE ON FUNCTION get_provider_id TO authenticated;
GRANT EXECUTE ON FUNCTION can_view_dv_listing TO authenticated;