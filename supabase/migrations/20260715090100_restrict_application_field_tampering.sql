-- Several problems found on the live database (not visible from migration
-- files alone - this table has accumulated overlapping/duplicate policies
-- over time):
--
-- 1. "providers_update_applications" and "provider_update_listing_applications"
--    (duplicates of each other) let a provider UPDATE any column on an
--    application for their own listing - not just status/notes, but the
--    seeker's submitted application_data, including their signature.
--
-- 2. "simple_seeker_update" has no status restriction at all, unlike the
--    more careful "seekers_update_draft_applications" sitting right next to
--    it - since Postgres OR's multiple permissive policies together, the
--    unrestricted one wins, letting a seeker edit their application (or its
--    status) even after a provider has already made a decision on it.
--
-- 3. soft_delete_application() is SECURITY DEFINER with NO ownership check
--    at all - it runs as the function owner (bypassing RLS by default,
--    same as any table-owner-run statement), so any authenticated user
--    calling it with any application id could withdraw/soft-delete an
--    application that isn't theirs.
--
-- Fixes: drop the duplicate/unrestricted policies; add a trigger enforcing
-- which COLUMNS each side can touch (RLS alone is row-level only); add the
-- missing ownership check to soft_delete_application. The trigger
-- specifically allows a seeker to transition their own application to
-- 'withdrawn' (self-service cancellation, used by the app's withdraw/delete
-- flows) while still blocking them from setting any other status.

DROP POLICY IF EXISTS "provider_update_listing_applications" ON public.applications;
DROP POLICY IF EXISTS "simple_seeker_update" ON public.applications;

CREATE OR REPLACE FUNCTION public.restrict_application_update_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_provider BOOLEAN;
BEGIN
  IF session_user = 'postgres' OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.listings
    WHERE id = NEW.listing_id AND provider_id = auth.uid()
  ) INTO is_provider;

  IF is_provider THEN
    -- Providers may only change status/notes/tracking fields - never the
    -- seeker's identity or their submitted application content.
    IF NEW.seeker_id IS DISTINCT FROM OLD.seeker_id
      OR NEW.listing_id IS DISTINCT FROM OLD.listing_id
      OR NEW.application_data IS DISTINCT FROM OLD.application_data
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
      OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
    THEN
      RAISE EXCEPTION 'Providers can only update application status, notes, and tracking fields';
    END IF;
  ELSE
    -- The seeker (or anyone else this row's other policies permit) may
    -- update their own submitted content and self-withdraw, but can't
    -- hand themselves an approval/rejection or reassign ownership.
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IS DISTINCT FROM 'withdrawn' THEN
      RAISE EXCEPTION 'Only the listing provider can change application status to that value';
    END IF;
    IF NEW.seeker_id IS DISTINCT FROM OLD.seeker_id
      OR NEW.listing_id IS DISTINCT FROM OLD.listing_id
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
    THEN
      RAISE EXCEPTION 'Cannot change application ownership fields';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS restrict_application_update_fields ON public.applications;
CREATE TRIGGER restrict_application_update_fields
  BEFORE UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.restrict_application_update_fields();

-- soft_delete_application() had no WHERE-clause ownership check at all.
CREATE OR REPLACE FUNCTION public.soft_delete_application(application_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE applications
  SET
    deleted_at = NOW(),
    status = 'withdrawn'
  WHERE id = application_id
    AND seeker_id = auth.uid();
END;
$function$;
