-- Test that the geocoding_cache table exists and is working
-- Run this in Supabase SQL Editor

-- 1. Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'geocoding_cache'
) as table_exists;

-- 2. Insert a test cache entry
INSERT INTO public.geocoding_cache (
  normalized_address,
  lat,
  lng,
  provider,
  confidence
) VALUES (
  '123 test st, los angeles, ca, 90001',
  34.0522,
  -118.2437,
  'mapbox',
  0.95
);

-- 3. Verify the insert worked
SELECT * FROM public.geocoding_cache;

-- 4. Test case-insensitive lookup (should find the entry above)
SELECT * FROM public.geocoding_cache
WHERE lower(normalized_address) = lower('123 TEST ST, LOS ANGELES, CA, 90001');

-- 5. Clean up test data
DELETE FROM public.geocoding_cache WHERE normalized_address = '123 test st, los angeles, ca, 90001';
