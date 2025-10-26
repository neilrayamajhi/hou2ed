-- SIMPLE FIX: Allow seekers to see active listings
-- Run this in Supabase SQL Editor

-- First, drop the broken policy
DROP POLICY IF EXISTS "Public can view listings with DV protection" ON listings;

-- Create a simple policy that works
CREATE POLICY "Anyone can view active listings"
ON listings 
FOR SELECT 
TO authenticated
USING (is_active = true);

-- Test it works
SELECT id, title, is_active, provider_id 
FROM listings 
WHERE is_active = true;
