-- Comprehensive fix for listings visibility issue
-- This will ensure seekers can see active listings

-- ========================================
-- STEP 1: Enable RLS on listings table
-- ========================================
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 2: Drop ALL existing policies first
-- ========================================
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'listings'
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.listings', pol.policyname);
    END LOOP;
END $$;

-- ========================================
-- STEP 3: Create new, permissive policies
-- ========================================

-- Policy 1: EVERYONE (including anon/seekers) can view active listings
CREATE POLICY "public_view_active_listings"
ON public.listings
FOR SELECT
TO public  -- This includes both anon and authenticated roles
USING (is_active = true);

-- Policy 2: Providers can view ALL their own listings (active or not)
CREATE POLICY "providers_view_own_listings"
ON public.listings
FOR SELECT
TO authenticated
USING (auth.uid() = provider_id);

-- Policy 3: Providers can insert their own listings
CREATE POLICY "providers_insert_listings"
ON public.listings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = provider_id);

-- Policy 4: Providers can update their own listings
CREATE POLICY "providers_update_listings"
ON public.listings
FOR UPDATE
TO authenticated
USING (auth.uid() = provider_id)
WITH CHECK (auth.uid() = provider_id);

-- Policy 5: Providers can delete their own listings
CREATE POLICY "providers_delete_listings"
ON public.listings
FOR DELETE
TO authenticated
USING (auth.uid() = provider_id);

-- ========================================
-- STEP 4: Create RPC function as backup
-- ========================================
-- This function bypasses RLS entirely for public data
CREATE OR REPLACE FUNCTION public.get_active_listings(
    user_lat DOUBLE PRECISION DEFAULT NULL,
    user_lng DOUBLE PRECISION DEFAULT NULL,
    radius_miles INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    housing_type TEXT,
    unit_beds JSONB,
    availability JSONB,
    cost JSONB,
    amenities JSONB,
    services JSONB,
    rules JSONB,
    eligibility JSONB,
    accessibility JSONB,
    intake JSONB,
    gender_rooming TEXT,
    images TEXT[],
    provider_id UUID,
    verified BOOLEAN,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with owner privileges, bypassing RLS
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        l.id,
        l.title,
        l.description,
        l.address,
        l.city,
        l.state,
        l.zip_code,
        l.lat,
        l.lng,
        l.housing_type,
        l.unit_beds,
        l.availability,
        l.cost,
        l.amenities,
        l.services,
        l.rules,
        l.eligibility,
        l.accessibility,
        l.intake,
        l.gender_rooming,
        l.images,
        l.provider_id,
        l.verified,
        l.is_active,
        l.created_at,
        l.updated_at
    FROM public.listings l
    WHERE l.is_active = true
    ORDER BY l.created_at DESC
    LIMIT 100;
END;
$$;

-- Grant execute permission to everyone
GRANT EXECUTE ON FUNCTION public.get_active_listings TO anon;
GRANT EXECUTE ON FUNCTION public.get_active_listings TO authenticated;

-- ========================================
-- STEP 5: Create simpler test function
-- ========================================
CREATE OR REPLACE FUNCTION public.get_all_active_listings()
RETURNS TABLE (
    id UUID,
    title TEXT,
    is_active BOOLEAN,
    provider_id UUID,
    city TEXT,
    state TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        l.id,
        l.title,
        l.is_active,
        l.provider_id,
        l.city,
        l.state
    FROM public.listings l
    WHERE l.is_active = true
    ORDER BY l.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_active_listings TO anon;
GRANT EXECUTE ON FUNCTION public.get_all_active_listings TO authenticated;

-- ========================================
-- STEP 6: Verify the setup
-- ========================================
-- Check if we have active listings
SELECT COUNT(*) as active_listings_count
FROM public.listings
WHERE is_active = true;

-- List the active listings
SELECT id, title, city, state, provider_id, is_active, created_at
FROM public.listings
WHERE is_active = true
ORDER BY created_at DESC;

-- Check the policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'listings'
ORDER BY policyname;

-- Test the RPC function
SELECT * FROM public.get_all_active_listings();