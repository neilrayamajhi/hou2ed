-- "Admins can update any profile" was present in the original profiles
-- migration but is missing from the live database (dropped at some point by
-- an untracked change outside version control — the same drift pattern that
-- previously took out "Admins can view all profiles"). Without it, admin
-- actions that write profiles.role (promote/demote) silently affect zero
-- rows under RLS. Restore it canonically using the non-recursive is_admin()
-- helper.

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
