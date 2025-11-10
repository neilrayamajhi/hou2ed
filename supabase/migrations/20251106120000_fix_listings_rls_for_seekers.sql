-- Fix RLS policies to allow seekers (anonymous users) to view active listings
-- This migration ensures that the public can see active listings without authentication

BEGIN;

-- Step 1: Drop all existing RLS policies on listings table
DROP POLICY IF EXISTS "Enable read access for all users" ON public.listings;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.listings;
DROP POLICY IF EXISTS "Enable update for users based on provider_id" ON public.listings;
DROP POLICY IF EXISTS "Enable delete for users based on provider_id" ON public.listings;
DROP POLICY IF EXISTS "Listings are viewable by everyone" ON public.listings;
DROP POLICY IF EXISTS "Providers can view all their listings" ON public.listings;
DROP POLICY IF EXISTS "Anyone can view active listings" ON public.listings;
DROP POLICY IF EXISTS "Users can view active listings" ON public.listings;
DROP POLICY IF EXISTS "Public can view active listings" ON public.listings;
DROP POLICY IF EXISTS "anon_can_view_active_listings" ON public.listings;
DROP POLICY IF EXISTS "providers_can_view_own_listings" ON public.listings;
DROP POLICY IF EXISTS "providers_can_create_listings" ON public.listings;
DROP POLICY IF EXISTS "providers_can_update_own_listings" ON public.listings;
DROP POLICY IF EXISTS "providers_can_delete_own_listings" ON public.listings;

-- Step 2: Create new RLS policies with proper permissions

-- Allow ANYONE (including anonymous/unauthenticated users) to view active listings
-- This is the critical policy that enables seekers to see listings
CREATE POLICY "public_view_active_listings"
ON public.listings
FOR SELECT
USING (is_active = true);

-- Allow authenticated providers to view all their own listings
CREATE POLICY "provider_view_own_listings"
ON public.listings
FOR SELECT
USING (auth.uid() = provider_id);

-- Allow authenticated providers to create listings
CREATE POLICY "provider_create_listings"
ON public.listings
FOR INSERT
WITH CHECK (auth.uid() = provider_id);

-- Allow authenticated providers to update their own listings
CREATE POLICY "provider_update_own_listings"
ON public.listings
FOR UPDATE
USING (auth.uid() = provider_id)
WITH CHECK (auth.uid() = provider_id);

-- Allow authenticated providers to delete their own listings
CREATE POLICY "provider_delete_own_listings"
ON public.listings
FOR DELETE
USING (auth.uid() = provider_id);

-- Step 3: Ensure proper grants for anonymous access
GRANT SELECT ON public.listings TO anon;
GRANT SELECT ON public.listings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.listings TO authenticated;

COMMIT;

-- Verify the fix
DO $$
BEGIN
    RAISE NOTICE 'RLS policies for listings table have been updated to allow public viewing of active listings';
END $$;