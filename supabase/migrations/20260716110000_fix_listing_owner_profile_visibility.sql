-- Fixes a real bug found while investigating a UI report ("provider name
-- shows blank on listing cards"): both the minimal-provider-profile RLS
-- policy and the provider_public_profiles view (both added in this
-- session's provider-profile-exposure fix) scoped visibility to
-- `role = 'provider'`, matching that fix's original narrow intent. But
-- listings.provider_id can point to ANY profile regardless of its role
-- column - in the live data, 10 of 11 active listings are owned by an
-- `admin`-role account (the developer's own account, used for test
-- listings), so the join/view returned nothing for almost every real
-- listing on the site.
--
-- The actual intent was always "let a seeker see who posted a listing
-- they're looking at", not "let a seeker see accounts whose role column
-- happens to say provider". Broadened both to the correct condition: any
-- profile that owns at least one active listing. Column exposure is
-- unchanged (still just id/full_name/avatar_url/username/role) - this
-- only widens which ROWS qualify, not which columns are visible.

DROP POLICY IF EXISTS "Anyone can view minimal provider profile fields" ON public.profiles;
CREATE POLICY "Anyone can view minimal listing-owner profile fields"
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.provider_id = profiles.id AND listings.is_active = true
    )
  );

CREATE OR REPLACE VIEW public.provider_public_profiles AS
SELECT id, full_name, avatar_url, username, role
FROM public.profiles
WHERE EXISTS (
  SELECT 1 FROM public.listings
  WHERE listings.provider_id = profiles.id AND listings.is_active = true
);

-- CREATE OR REPLACE VIEW resets reloptions, so security_invoker has to be
-- re-applied after redefining the view. Unlike public_listings (which
-- intentionally needs elevated privileges to redact DV-sensitive columns
-- before returning them), this view has nothing to redact - it can and
-- should run as the invoker, relying on the real GRANT + RLS policy above
-- to control visibility, per the Security Advisor's original guidance.
ALTER VIEW public.provider_public_profiles SET (security_invoker = true);
