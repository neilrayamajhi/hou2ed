-- Check your recent listings and their coordinates
SELECT
  id,
  title,
  address,
  city,
  state,
  zip_code,
  lat,
  lng,
  is_active,
  created_at
FROM listings
WHERE provider_id = (SELECT auth.uid())  -- Your listings only
ORDER BY created_at DESC
LIMIT 10;

-- Check if geocoding cache has any entries
SELECT
  normalized_address,
  lat,
  lng,
  provider,
  created_at
FROM geocoding_cache
ORDER BY created_at DESC
LIMIT 10;
