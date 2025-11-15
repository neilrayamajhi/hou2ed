-- Update listings RLS policies to respect user blocking
-- This replaces the existing policies to include block checks

BEGIN;

-- Step 1: Drop the incorrectly added blocking policy
DROP POLICY IF EXISTS "Hide listings from blocked providers" ON public.listings;

-- Step 2: Drop and recreate the public view policy with block checks
DROP POLICY IF EXISTS "public_view_active_listings" ON public.listings;

-- Allow ANYONE to view active listings EXCEPT from blocked providers
CREATE POLICY "public_view_active_listings"
ON public.listings
FOR SELECT
USING (
  is_active = true
  -- Hide if current user has blocked this provider
  AND NOT EXISTS (
    SELECT 1 FROM blocks
    WHERE blocker_id = auth.uid() AND blocked_id = listings.provider_id
  )
  -- Hide if provider has blocked current user
  AND NOT EXISTS (
    SELECT 1 FROM blocks
    WHERE blocker_id = listings.provider_id AND blocked_id = auth.uid()
  )
);

-- Step 3: Update provider's own listings view (providers can always see their own)
DROP POLICY IF EXISTS "provider_view_own_listings" ON public.listings;

CREATE POLICY "provider_view_own_listings"
ON public.listings
FOR SELECT
USING (auth.uid() = provider_id);

COMMIT;

-- Verify
DO $$
BEGIN
    RAISE NOTICE 'Listings RLS policies updated to respect user blocking';
END $$;
