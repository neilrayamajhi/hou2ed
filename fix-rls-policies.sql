-- Fix RLS policies to allow seekers to view active listings

-- First drop all existing policies on listings table
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

-- Create new policies with correct permissions

-- CRITICAL: Allow ANYONE (including anonymous users) to view active listings
-- This is the most important policy for seekers!
CREATE POLICY "anon_view_active_listings"
ON public.listings
FOR SELECT
USING (is_active = true);

-- Allow authenticated providers to view all their own listings
CREATE POLICY "providers_view_own"
ON public.listings
FOR SELECT
USING (auth.uid() = provider_id);

-- Allow authenticated providers to create listings
CREATE POLICY "providers_create"
ON public.listings
FOR INSERT
WITH CHECK (auth.uid() = provider_id);

-- Allow authenticated providers to update their own listings
CREATE POLICY "providers_update"
ON public.listings
FOR UPDATE
USING (auth.uid() = provider_id)
WITH CHECK (auth.uid() = provider_id);

-- Allow authenticated providers to delete their own listings
CREATE POLICY "providers_delete"
ON public.listings
FOR DELETE
USING (auth.uid() = provider_id);

-- Verify the policies are applied
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'listings'
ORDER BY policyname;