-- Adds account ban/suspension support for admin user management.
--
-- Ban is enforced at the Auth layer (GoTrue ban_duration, set by the
-- admin-user-action Edge Function using the service role) — these columns
-- are a fast, RLS-visible mirror of that state for lists/badges/other
-- policies to read, not the enforcement mechanism itself.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS banned_reason TEXT,
  ADD COLUMN IF NOT EXISTS banned_by UUID REFERENCES public.profiles(id);

-- ============================================================================
-- Block self-serve un-ban. "Users can update own profile" has no column
-- restriction, so without this a banned user could flip is_banned back to
-- false themselves — the same shape of hole prevent_role_self_escalation
-- closed for profiles.role.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.prevent_ban_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_banned IS DISTINCT FROM OLD.is_banned THEN
    IF session_user = 'postgres' OR auth.role() = 'service_role' THEN
      RETURN NEW;
    END IF;

    IF public.is_admin(auth.uid()) THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Only an admin can change a user ban status';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_ban_self_escalation ON public.profiles;
CREATE TRIGGER prevent_ban_self_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_ban_self_escalation();
