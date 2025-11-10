-- Migration: Fix RLS policies to allow seekers to view active listings
-- Date: 2025-11-06
-- Purpose: Enable anonymous users (seekers) to view active listings

-- Step 1: Drop all existing policies on listings table
DO $$
BEGIN
    -- Drop policies if they exist (ignore errors if they don't)
    DROP POLICY IF EXISTS "Enable read access for all users" ON public.listings;
    DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.listings;
    DROP POLICY IF EXISTS "Enable update for users based on provider_id" ON public.listings;
    DROP POLICY IF EXISTS "Enable delete for users based on provider_id" ON public.listings;
    DROP POLICY IF EXISTS "Listings are viewable by everyone" ON public.listings;
    DROP POLICY IF EXISTS "Providers can view all their listings" ON public.listings;
    DROP POLICY IF EXISTS "Anyone can view active listings" ON public.listings;
    DROP POLICY IF EXISTS "Users can view active listings" ON public.listings;
    DROP POLICY IF EXISTS "Public can view active listings" ON public.listings;
    DROP POLICY IF EXISTS "Providers view own listings" ON public.listings;
    DROP POLICY IF EXISTS "Providers create own listings" ON public.listings;
    DROP POLICY IF EXISTS "Providers update own listings" ON public.listings;
    DROP POLICY IF EXISTS "Providers create listings" ON public.listings;
    DROP POLICY IF EXISTS "Providers update their listings" ON public.listings;
    DROP POLICY IF EXISTS "Providers can create listings" ON public.listings;
    DROP POLICY IF EXISTS "Providers can update their listings" ON public.listings;
    DROP POLICY IF EXISTS "Providers can delete their listings" ON public.listings;
    DROP POLICY IF EXISTS "anon_view_active_listings" ON public.listings;
    DROP POLICY IF EXISTS "providers_view_own" ON public.listings;
    DROP POLICY IF EXISTS "providers_create" ON public.listings;
    DROP POLICY IF EXISTS "providers_update" ON public.listings;
    DROP POLICY IF EXISTS "providers_delete" ON public.listings;
EXCEPTION
    WHEN undefined_object THEN
        -- Ignore if policies don't exist
        NULL;
END $$;

-- Step 2: Create new RLS policies

-- CRITICAL: This policy allows ANYONE (including anonymous users) to view active listings
-- This is what enables seekers to see listings without authentication
CREATE POLICY "anon_can_view_active_listings"
ON public.listings
FOR SELECT
USING (is_active = true);

-- Allow authenticated providers to view all their own listings (including inactive)
CREATE POLICY "providers_can_view_own_listings"
ON public.listings
FOR SELECT
USING (auth.uid() = provider_id);

-- Allow authenticated providers to create new listings
CREATE POLICY "providers_can_create_listings"
ON public.listings
FOR INSERT
WITH CHECK (auth.uid() = provider_id);

-- Allow authenticated providers to update their own listings
CREATE POLICY "providers_can_update_own_listings"
ON public.listings
FOR UPDATE
USING (auth.uid() = provider_id)
WITH CHECK (auth.uid() = provider_id);

-- Allow authenticated providers to delete their own listings
CREATE POLICY "providers_can_delete_own_listings"
ON public.listings
FOR DELETE
USING (auth.uid() = provider_id);

-- Step 3: Grant necessary permissions to anonymous role
GRANT SELECT ON public.listings TO anon;
GRANT SELECT ON public.listings TO authenticated;
GRANT ALL ON public.listings TO authenticated;

-- Step 4: Create a function to bypass RLS for public data (optional fallback)
CREATE OR REPLACE FUNCTION public.get_active_listings_public()
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
    images TEXT[],
    provider_id UUID,
    verified BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT
        id,
        title,
        description,
        address,
        city,
        state,
        zip_code,
        lat,
        lng,
        housing_type,
        unit_beds,
        availability,
        cost,
        amenities,
        services,
        rules,
        eligibility,
        images,
        provider_id,
        verified,
        created_at,
        updated_at
    FROM public.listings
    WHERE is_active = true
    ORDER BY created_at DESC
    LIMIT 100;
$$;

-- Grant execute permission on the function to anonymous users
GRANT EXECUTE ON FUNCTION public.get_active_listings_public TO anon;
GRANT EXECUTE ON FUNCTION public.get_active_listings_public TO authenticated;

-- Step 5: Verify the policies were created correctly
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'listings'
    AND policyname LIKE '%anon_can_view_active_listings%';

    IF policy_count = 0 THEN
        RAISE NOTICE 'WARNING: anon_can_view_active_listings policy was not created!';
    ELSE
        RAISE NOTICE 'SUCCESS: RLS policies created successfully';
    END IF;
END $$;