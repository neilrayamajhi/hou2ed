-- Fix RLS policy to allow providers to soft-delete (update is_active) their own listings
-- Run this in your Supabase SQL Editor

-- ============================================
-- STEP 1: View existing policies
-- ============================================
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
WHERE tablename = 'listings'
ORDER BY cmd, policyname;

-- ============================================
-- STEP 2: Drop ALL existing UPDATE policies
-- ============================================
-- We'll drop any existing update policies and create a fresh one
DROP POLICY IF EXISTS "Providers can update their own listings" ON listings;
DROP POLICY IF EXISTS "Providers can update own listings" ON listings;
DROP POLICY IF EXISTS "providers_update_own_listings" ON listings;
DROP POLICY IF EXISTS "Enable update for providers" ON listings;

-- ============================================
-- STEP 3: Create comprehensive UPDATE policy
-- ============================================
CREATE POLICY "providers_can_update_own_listings"
ON listings
FOR UPDATE
TO authenticated
USING (
  -- Can only update listings they own
  provider_id = auth.uid()
)
WITH CHECK (
  -- After update, still must be owned by same provider
  provider_id = auth.uid()
);

-- ============================================
-- STEP 4: Ensure SELECT policy exists
-- ============================================
-- Providers need to be able to read their listings too
DROP POLICY IF EXISTS "Providers can view their own listings" ON listings;
DROP POLICY IF EXISTS "providers_view_own_listings" ON listings;

CREATE POLICY "providers_view_own_listings"
ON listings
FOR SELECT
TO authenticated
USING (
  provider_id = auth.uid()
);

-- ============================================
-- STEP 5: Verify policies are now correct
-- ============================================
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'listings' AND cmd IN ('SELECT', 'UPDATE')
ORDER BY cmd, policyname;

-- ============================================
-- STEP 6: Test the update (OPTIONAL)
-- ============================================
-- If you want to test manually, uncomment and replace the ID:
-- UPDATE listings
-- SET is_active = false, updated_at = NOW()
-- WHERE id = 'paste-your-listing-id-here' AND provider_id = auth.uid();

-- You should see: "UPDATE 1" if successful
