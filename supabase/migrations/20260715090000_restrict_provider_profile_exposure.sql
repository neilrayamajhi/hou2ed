-- "Authenticated users can view provider profiles" was meant to expose just
-- a provider's name + avatar on the listing detail screen, but RLS is
-- row-level, not column-level - it actually grants the entire row,
-- including verification_documents, phone, email, and every other column,
-- to any logged-in seeker who queries profiles directly (not just through
-- the app's own carefully-scoped queries).
--
-- Fix: replace the table-level policy with a narrow view exposing only the
-- safe columns. The view is owned by the migration role, so it bypasses RLS
-- on the underlying table by design - the view's own column list is the
-- security boundary now, not a row policy.

DROP POLICY IF EXISTS "Authenticated users can view provider profiles" ON public.profiles;

CREATE OR REPLACE VIEW public.provider_public_profiles AS
SELECT id, full_name, avatar_url, username, role
FROM public.profiles
WHERE role = 'provider';

GRANT SELECT ON public.provider_public_profiles TO authenticated;
