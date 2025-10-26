-- Fix listings RLS policies to use correct column name
-- The previous migration used `active` but the schema uses `is_active`

-- ============================================
-- LISTINGS TABLE RLS FIX
-- ============================================

-- Drop the broken policy
DROP POLICY IF EXISTS "Public can view listings with DV protection" ON listings;

-- Create corrected policy with proper column name
CREATE POLICY "Public can view listings with DV protection"
    ON listings FOR SELECT
    USING (
        is_active = true  -- ✅ Fixed: was 'active', should be 'is_active'
        AND (
            -- Non-DV listings: show everything
            domestic_violence_focus = false
            OR domestic_violence_focus IS NULL  -- Also handle NULL case
            OR
            -- DV listings: only show to authorized users
            (
                domestic_violence_focus = true
                AND (
                    -- Provider owns the listing
                    provider_id IN (
                        SELECT id FROM providers WHERE user_id = auth.uid()
                    )
                    OR
                    -- User is an admin
                    EXISTS (
                        SELECT 1 FROM profiles
                        WHERE user_id = auth.uid()
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

-- ============================================
-- VERIFY THE FIX
-- ============================================

-- Test query: This should now return active listings for any authenticated user
-- SELECT id, title, is_active FROM listings WHERE is_active = true;

COMMENT ON POLICY "Public can view listings with DV protection" ON listings IS
'Allows authenticated users to view active listings. DV shelter locations are only visible to providers who own them, admins, or seekers with approved applications.';
