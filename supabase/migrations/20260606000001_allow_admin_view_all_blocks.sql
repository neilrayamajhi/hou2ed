-- Allow admins to view all blocks (needed for admin dashboard safety stats).
-- Mirrors the existing "Admins can view all profiles" policy pattern.

CREATE POLICY "Admins can view all blocks"
  ON blocks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );
