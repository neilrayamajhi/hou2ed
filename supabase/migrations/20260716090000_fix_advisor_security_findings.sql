-- Fixes findings from Supabase's Security Advisor:
--
-- 1. public.rate_limits had no RLS at all - anyone with the public API key
--    could read or delete rows directly, bypassing check_rate_limit()
--    entirely (defeating the rate limiting added this session) and, once
--    real traffic exists, reading real login/signup email addresses out of
--    the `key` column. check_rate_limit() is SECURITY DEFINER (owned by
--    postgres), so it bypasses RLS regardless - locking the table down to
--    "no direct client access" does not break it.
--
-- 2. public.provider_public_profiles was a SECURITY DEFINER-style view
--    (Postgres's legacy default: a view runs with its creator's privileges,
--    bypassing RLS on the underlying table, unless security_invoker is
--    set). Flipping security_invoker on without anything else broke the
--    view for real users - anon had zero grants on profiles at all, and
--    authenticated's only SELECT policy covered your own profile or a
--    shared message thread, not "any provider". The old view worked only
--    because it bypassed both of those checks entirely, relying solely on
--    its own SELECT list never changing to include something sensitive.
--    Fixed properly instead of reverting: added a column-level GRANT for
--    just the safe fields (id, full_name, avatar_url, username, role) plus
--    a matching RLS policy scoped to role = 'provider'. This is more
--    robust than the original SECURITY DEFINER approach - even if the view
--    definition is ever edited to add a sensitive column, the column-level
--    grant still blocks it from anon/authenticated.
--
-- 3. public.spatial_ref_sys (a PostGIS extension system table holding
--    public coordinate-system reference data, not application data) is
--    flagged for having RLS disabled. Not fixed - it's owned by
--    `supabase_admin`, a platform-reserved role project owners cannot
--    ALTER. This is a standard, benign, commonly-unfixable Advisor finding
--    for any project using PostGIS; left as-is deliberately.

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- Deliberately no policies: only the SECURITY DEFINER check_rate_limit()
-- RPC should ever touch this table. No role gets direct SELECT/INSERT/
-- UPDATE/DELETE through PostgREST.

ALTER VIEW public.provider_public_profiles SET (security_invoker = true);

GRANT SELECT (id, full_name, avatar_url, username, role)
  ON public.profiles
  TO anon, authenticated;

CREATE POLICY "Anyone can view minimal provider profile fields"
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (role = 'provider');
