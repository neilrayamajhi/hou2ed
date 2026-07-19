-- Same class of bug as the original admin role escalation: "Users can
-- update own profile" has no column restriction, so without this trigger
-- any user could set their own verification_status to 'verified' directly,
-- completely bypassing admin review. Found and fixed during live testing of
-- the verification review feature, not by inspection alone.

CREATE OR REPLACE FUNCTION public.prevent_verification_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    IF session_user = 'postgres' OR auth.role() = 'service_role' THEN
      RETURN NEW;
    END IF;

    IF public.is_admin(auth.uid()) THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Only an admin can change verification status';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_verification_self_escalation ON public.profiles;
CREATE TRIGGER prevent_verification_self_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_verification_self_escalation();
