-- Check all active listings
SELECT 
  id,
  title,
  is_active,
  provider_id,
  lat,
  lng,
  address,
  city,
  state,
  created_at
FROM listings
WHERE is_active = true;
