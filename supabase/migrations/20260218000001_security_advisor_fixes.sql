-- ============================================================================
-- Security Advisor Fixes
-- Date: 2026-02-18
-- Fixes:
--   1. public_listings view runs as superuser (SECURITY DEFINER) — switch to
--      SECURITY INVOKER so RLS on the underlying listings table is respected
--   2. spatial_ref_sys (PostGIS reference table) has no RLS
--   3. geocoding_cache has no RLS
-- ============================================================================

-- FIX 1: Make public_listings view respect the querying user's permissions
-- (security_invoker = on means the view runs as whoever is querying it,
--  not as the postgres superuser who created it)
ALTER VIEW public.public_listings SET (security_invoker = on);

-- FIX 2: spatial_ref_sys — CANNOT BE FIXED via migration.
-- This table is owned by the PostGIS extension (not by us), so Postgres
-- won't let us run ALTER TABLE on it. It contains only public geographic
-- reference data (coordinate system definitions), no user data.
-- Supabase Security Advisor flags it but it is a known false positive for
-- PostGIS extension tables. Nothing sensitive is exposed.

-- FIX 3: Enable RLS on geocoding_cache.
-- Address lookups are public data (lat/lng for addresses, not user data).
-- Read is open to all; writes go through the service role (bypasses RLS).
ALTER TABLE public.geocoding_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "geocoding_cache is publicly readable"
  ON public.geocoding_cache
  FOR SELECT
  USING (true);
