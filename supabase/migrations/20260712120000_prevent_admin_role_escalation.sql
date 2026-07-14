-- Close two privilege-escalation holes around profiles.role, and restore
-- admin read access to all profiles without the self-referential RLS
-- recursion that took that policy down previously.
--
-- Hole 1: handle_new_user() trusted raw_user_meta_data->>'role' verbatim,
--         so anyone calling auth.signUp() with { data: { role: 'admin' } }
--         became an admin instantly.
-- Hole 2: "Users can update own profile" only checks id = auth.uid(), not
--         which columns changed, so any user could set their own role to
--         'admin' via a normal profile update.

-- ============================================================================
-- 1. Non-recursive admin check.
--    SECURITY DEFINER, owned by the migration role (table owner), so this
--    lookup bypasses RLS instead of re-triggering the policy that calls it.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = uid AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;

-- ============================================================================
-- 2. Restore admin read access to all profiles (needed for the admin
--    dashboard's stats/analytics queries).
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============================================================================
-- 3. Never trust a client-supplied "admin" role at signup.
--    Seeker/provider stay client-chosen; admin can only be granted by an
--    existing admin (or directly in the database).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    username,
    role,
    phone,
    is_verified,
    push_notifications_enabled,
    email_notifications_enabled,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    LOWER(NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substring(NEW.id::text, 1, 8)),
    CASE WHEN NEW.raw_user_meta_data->>'role' = 'provider' THEN 'provider' ELSE 'seeker' END,
    NEW.phone,
    FALSE,
    TRUE,
    TRUE,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

  RAISE NOTICE 'Profile created for user: %', NEW.id;
  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to create profile for user %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 4. Block any change to profiles.role unless made by an existing admin, or
--    by a trusted server-side context (a migration run, or the service role).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- NOTE: this function is SECURITY DEFINER, so current_user would always
    -- report the function owner (postgres), not the real caller. session_user
    -- reflects the actual connection role and must be used here instead.
    -- session_user = 'postgres' covers direct/migration connections; PostgREST
    -- always connects as 'authenticator' and sets the JWT role claim instead,
    -- so the service-role case is detected via auth.role() below.
    IF session_user = 'postgres' OR auth.role() = 'service_role' THEN
      RETURN NEW;
    END IF;

    IF public.is_admin(auth.uid()) THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Only an admin can change a user role';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_role_self_escalation ON public.profiles;
CREATE TRIGGER prevent_role_self_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_self_escalation();
