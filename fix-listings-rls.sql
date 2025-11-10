-- Fix RLS policies for listings table to allow seekers to view active listings

-- First, let's check existing policies
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
WHERE tablename = 'listings';

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Listings are viewable by everyone" ON public.listings;
DROP POLICY IF EXISTS "Providers can view all their listings" ON public.listings;
DROP POLICY IF EXISTS "Anyone can view active listings" ON public.listings;
DROP POLICY IF EXISTS "Users can view active listings" ON public.listings;

-- Create new policies

-- 1. Allow anyone (including anonymous users/seekers) to view active listings
CREATE POLICY "Anyone can view active listings"
ON public.listings
FOR SELECT
USING (is_active = true);

-- 2. Allow providers to view all their own listings (including inactive ones)
CREATE POLICY "Providers can view all their listings"
ON public.listings
FOR SELECT
USING (auth.uid() = provider_id);

-- 3. Allow providers to insert their own listings
CREATE POLICY "Providers can create listings"
ON public.listings
FOR INSERT
WITH CHECK (auth.uid() = provider_id);

-- 4. Allow providers to update their own listings
CREATE POLICY "Providers can update their listings"
ON public.listings
FOR UPDATE
USING (auth.uid() = provider_id)
WITH CHECK (auth.uid() = provider_id);

-- 5. Allow providers to delete their own listings (soft delete)
CREATE POLICY "Providers can delete their listings"
ON public.listings
FOR DELETE
USING (auth.uid() = provider_id);

-- Verify the policies were created
SELECT
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'listings'
ORDER BY policyname;