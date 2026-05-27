-- Allow authenticated users to view provider profiles.
-- Needed so seekers can see the provider name + avatar on listing detail screens.
CREATE POLICY "Authenticated users can view provider profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (role = 'provider');
