-- Check how provider_id relates to auth users
-- Run this to understand the relationship

-- 1. Check your current auth user ID
SELECT auth.uid() as my_auth_id;

-- 2. Check if you have a profile
SELECT id, email, role FROM profiles WHERE id = auth.uid();

-- 3. Check listings and their provider_ids
SELECT id, title, provider_id, is_active FROM listings WHERE is_active = true;

-- 4. Check if there's a providers table
SELECT id, user_id FROM providers WHERE user_id = auth.uid();
