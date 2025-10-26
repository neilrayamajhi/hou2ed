-- Check what image URLs are stored in listings
SELECT
  id,
  title,
  images,
  array_length(images, 1) as image_count
FROM listings
WHERE is_active = true
ORDER BY created_at DESC
LIMIT 10;

-- Check if images are public URLs
SELECT
  id,
  title,
  images->0 as first_image
FROM listings
WHERE is_active = true
  AND images IS NOT NULL
  AND array_length(images, 1) > 0
LIMIT 5;
