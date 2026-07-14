-- Listings RLS has drifted across several "fix listings RLS" patches over
-- time. Reissue the admin grant canonically using the non-recursive
-- is_admin() helper so it's self-evidently correct going forward, regardless
-- of whatever inline-EXISTS version is currently live.

DROP POLICY IF EXISTS "Admins can manage all listings" ON public.listings;
CREATE POLICY "Admins can manage all listings"
  ON public.listings
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
