-- Check if storage buckets exist
SELECT
  name,
  public,
  created_at
FROM storage.buckets
WHERE name IN ('listing-images', 'application-docs');

-- If no results, we need to create the buckets
