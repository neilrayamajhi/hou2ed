-- Create RPC function for updating provider availability
-- Allows providers to update bed counts with a "confirm no change" option

CREATE OR REPLACE FUNCTION fn_update_availability(
    p_listing_id UUID,
    p_beds_today INTEGER DEFAULT NULL,
    p_beds_week INTEGER DEFAULT NULL,
    p_waitlist_days INTEGER DEFAULT NULL,
    p_confirm_only BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_provider_id UUID;
    v_listing RECORD;
    v_result JSONB;
    v_changes JSONB = '[]'::JSONB;
BEGIN
    -- Get the current user's provider ID
    SELECT id INTO v_provider_id
    FROM profiles
    WHERE id = auth.uid() AND role = 'provider';

    IF v_provider_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Not authorized as a provider'
        );
    END IF;

    -- Lock the listing row for update and verify ownership
    SELECT * INTO v_listing
    FROM listings
    WHERE id = p_listing_id
      AND provider_id = v_provider_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Listing not found or not owned by provider'
        );
    END IF;

    -- If confirm_only is true, just update the last_confirmed timestamp
    IF p_confirm_only THEN
        UPDATE listings
        SET
            last_confirmed = NOW(),
            updated_at = NOW()
        WHERE id = p_listing_id;

        -- Record the confirmation in availability history
        INSERT INTO availability_history (
            listing_id,
            provider_id,
            beds_available_today,
            beds_available_this_week,
            waitlist_days,
            change_type,
            notes
        ) VALUES (
            p_listing_id,
            v_provider_id,
            v_listing.beds_available_today,
            v_listing.beds_available_this_week,
            v_listing.waitlist_days,
            'confirmed',
            'Provider confirmed no changes to availability'
        );

        RETURN jsonb_build_object(
            'success', true,
            'message', 'Availability confirmed',
            'data', jsonb_build_object(
                'listing_id', p_listing_id,
                'confirmed_at', NOW(),
                'beds_today', v_listing.beds_available_today,
                'beds_week', v_listing.beds_available_this_week,
                'waitlist_days', v_listing.waitlist_days
            )
        );
    END IF;

    -- Build changes array for tracking what changed
    IF p_beds_today IS NOT NULL AND p_beds_today != v_listing.beds_available_today THEN
        v_changes = v_changes || jsonb_build_object(
            'field', 'beds_today',
            'from', v_listing.beds_available_today,
            'to', p_beds_today
        );
    END IF;

    IF p_beds_week IS NOT NULL AND p_beds_week != v_listing.beds_available_this_week THEN
        v_changes = v_changes || jsonb_build_object(
            'field', 'beds_week',
            'from', v_listing.beds_available_this_week,
            'to', p_beds_week
        );
    END IF;

    IF p_waitlist_days IS NOT NULL AND p_waitlist_days != v_listing.waitlist_days THEN
        v_changes = v_changes || jsonb_build_object(
            'field', 'waitlist_days',
            'from', v_listing.waitlist_days,
            'to', p_waitlist_days
        );
    END IF;

    -- If no changes provided, return error
    IF jsonb_array_length(v_changes) = 0 AND NOT p_confirm_only THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No changes provided. Use confirm_only=true to confirm current values.'
        );
    END IF;

    -- Update the listing with new values
    UPDATE listings
    SET
        beds_available_today = COALESCE(p_beds_today, beds_available_today),
        beds_available_this_week = COALESCE(p_beds_week, beds_available_this_week),
        waitlist_days = COALESCE(p_waitlist_days, waitlist_days),
        last_confirmed = NOW(),
        updated_at = NOW()
    WHERE id = p_listing_id;

    -- Record the changes in availability history
    INSERT INTO availability_history (
        listing_id,
        provider_id,
        beds_available_today,
        beds_available_this_week,
        waitlist_days,
        change_type,
        changes,
        notes
    ) VALUES (
        p_listing_id,
        v_provider_id,
        COALESCE(p_beds_today, v_listing.beds_available_today),
        COALESCE(p_beds_week, v_listing.beds_available_this_week),
        COALESCE(p_waitlist_days, v_listing.waitlist_days),
        'updated',
        v_changes,
        'Provider updated availability'
    );

    -- Check if this update affects any saved search alerts
    -- Alert users who have saved searches matching this listing
    PERFORM fn_check_saved_search_alerts(p_listing_id);

    -- Return success with updated values
    SELECT
        beds_available_today,
        beds_available_this_week,
        waitlist_days,
        last_confirmed
    INTO v_listing
    FROM listings
    WHERE id = p_listing_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Availability updated successfully',
        'data', jsonb_build_object(
            'listing_id', p_listing_id,
            'beds_today', v_listing.beds_available_today,
            'beds_week', v_listing.beds_available_this_week,
            'waitlist_days', v_listing.waitlist_days,
            'last_confirmed', v_listing.last_confirmed,
            'changes', v_changes
        )
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'An error occurred: ' || SQLERRM
        );
END;
$$;

-- Create availability history table to track changes
CREATE TABLE IF NOT EXISTS availability_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES profiles(id),
    beds_available_today INTEGER,
    beds_available_this_week INTEGER,
    waitlist_days INTEGER,
    change_type TEXT NOT NULL CHECK (change_type IN ('created', 'updated', 'confirmed')),
    changes JSONB DEFAULT '[]'::JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX idx_availability_history_listing ON availability_history(listing_id, created_at DESC);
CREATE INDEX idx_availability_history_provider ON availability_history(provider_id, created_at DESC);

-- RLS policies for availability history
ALTER TABLE availability_history ENABLE ROW LEVEL SECURITY;

-- Providers can see their own availability history
CREATE POLICY "Providers can view own availability history"
    ON availability_history
    FOR SELECT
    USING (provider_id = auth.uid());

-- Function to check and create alerts for saved searches when availability changes
CREATE OR REPLACE FUNCTION fn_check_saved_search_alerts(p_listing_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_listing RECORD;
    v_search RECORD;
BEGIN
    -- Get the updated listing details
    SELECT * INTO v_listing FROM listings WHERE id = p_listing_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Find all saved searches that might match this listing
    FOR v_search IN
        SELECT ss.*
        FROM saved_searches ss
        WHERE ss.notification_enabled = TRUE
          AND (
            -- Check if the search filters match the listing
            (ss.filters->>'housingType' IS NULL OR ss.filters->>'housingType' = v_listing.housing_type::TEXT)
            AND (ss.filters->>'unitBedType' IS NULL OR ss.filters->>'unitBedType' = v_listing.unit_beds::TEXT)
            AND (ss.filters->>'minPrice' IS NULL OR (ss.filters->>'minPrice')::INTEGER <= v_listing.monthly_rent)
            AND (ss.filters->>'maxPrice' IS NULL OR (ss.filters->>'maxPrice')::INTEGER >= v_listing.monthly_rent)
            -- Add more filter checks as needed
          )
    LOOP
        -- Check if we already created an alert for this listing recently
        IF NOT EXISTS (
            SELECT 1
            FROM saved_search_alerts
            WHERE search_id = v_search.id
              AND listing_id = p_listing_id
              AND created_at > NOW() - INTERVAL '24 hours'
        ) THEN
            -- Create a new alert
            INSERT INTO saved_search_alerts (
                search_id,
                user_id,
                listing_id,
                alert_type,
                message
            ) VALUES (
                v_search.id,
                v_search.user_id,
                p_listing_id,
                'availability_update',
                format('Availability updated for %s: %s beds available today',
                    v_listing.name,
                    v_listing.beds_available_today)
            );
        END IF;
    END LOOP;
END;
$$;

-- Grant execute permission to authenticated users (providers)
GRANT EXECUTE ON FUNCTION fn_update_availability TO authenticated;
GRANT EXECUTE ON FUNCTION fn_check_saved_search_alerts TO authenticated;

-- Add last_confirmed column to listings if it doesn't exist
ALTER TABLE listings ADD COLUMN IF NOT EXISTS last_confirmed TIMESTAMPTZ DEFAULT NOW();