-- Ensure ON CONFLICT works on normalized_address
-- Create a plain unique index on normalized_address to support upserts
create unique index if not exists geocache_unique_normalized_address_plain
  on public.geocoding_cache (normalized_address);

