-- CRITICAL FIX: DV-sensitive listings were fully exposed, unobfuscated, to
-- ANY caller including fully anonymous requests with no login at all.
--
-- listings had three overlapping SELECT policies:
--   1. "Anyone can view listings" - USING (true), completely unconditional.
--   2. "public_view_active_listings" - checked is_active + blocking, but
--      never checked dv_sensitive at all.
--   3. "View listings with DV safety" - the only one that actually tried to
--      gate DV-sensitive rows, requiring auth.uid() IS NOT NULL - but since
--      RLS permissive policies are OR'd together, satisfying EITHER of the
--      first two (which don't mention dv_sensitive) was enough on its own,
--      making policy 3 completely moot in practice.
--
-- Verified live with a disposable test listing before this fix: a fully
-- anonymous request (no session, just the public API key) returned the
-- exact unobfuscated address/lat/lng of a dv_sensitive=true listing.
--
-- The app has real DV-safety infrastructure for this (the public_listings
-- view and get_listing_safe() function, both of which obfuscate
-- address/zip/lat/lng to city-level precision for anyone who isn't the
-- listing's own provider or an admin) - but SearchScreen.tsx and
-- ListingDetailsScreen.tsx query the raw `listings` table directly instead
-- of going through either safe path, and the raw table's RLS never actually
-- stopped them from getting full-precision data.
--
-- Fix: replace all three policies with one correct one. Non-DV listings
-- keep working exactly as before (public, blocking-aware). DV-sensitive
-- listings are now only visible via the raw table to their own provider or
-- an admin - everyone else must go through public_listings/get_listing_safe,
-- which still work (they intentionally bypass this RLS by running with
-- elevated privileges, precisely so they can read the real row and decide
-- what to redact - this is the correct, intentional design for that kind of
-- view/function and should not be "fixed" into security_invoker later).

DROP POLICY IF EXISTS "Anyone can view listings" ON public.listings;
DROP POLICY IF EXISTS "public_view_active_listings" ON public.listings;
DROP POLICY IF EXISTS "View listings with DV safety" ON public.listings;

-- Uses is_user_blocked() (SECURITY DEFINER) rather than a raw EXISTS against
-- blocks directly, since anon has no table-level GRANT on blocks and a raw
-- subquery would error out for anonymous browsing entirely.
CREATE POLICY "View active listings with DV safety and blocking"
  ON public.listings
  FOR SELECT
  TO public
  USING (
    is_active = true
    AND NOT public.is_user_blocked(auth.uid(), provider_id)
    AND NOT public.is_user_blocked(provider_id, auth.uid())
    AND (
      dv_sensitive = false
      OR auth.uid() = provider_id
      OR public.is_admin(auth.uid())
    )
  );

-- public_listings was already (independently of this fix) set to
-- security_invoker=on, which silently broke it: it needs to run with
-- elevated privileges to read the real address/lat/lng of a DV-sensitive
-- listing and decide what to redact, before ever returning a row to the
-- caller. With security_invoker on, the view's own internal query is
-- subject to the caller's RLS - which, after the fix above, correctly
-- hides raw DV-sensitive rows from non-owners - so the view could no
-- longer see anything to redact, and silently returned nothing instead of
-- the intended obfuscated row. This went unnoticed because zero real
-- DV-sensitive listings existed in production to expose the break.
ALTER VIEW public.public_listings SET (security_invoker = false);
