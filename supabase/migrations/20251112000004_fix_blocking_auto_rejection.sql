-- Fix auto-rejection trigger to reject ALL non-final applications
-- Including approved and completed applications when provider blocks seeker
-- Adds debugging logs to help troubleshoot blocking issues

BEGIN;

-- Drop and recreate the trigger function with fixes
CREATE OR REPLACE FUNCTION auto_reject_blocked_seeker_applications()
RETURNS TRIGGER AS $$
DECLARE
  blocker_role TEXT;
  affected_count INTEGER;
BEGIN
  -- Debug: Log when trigger fires
  RAISE NOTICE 'Block trigger fired: blocker_id=%, blocked_id=%', NEW.blocker_id, NEW.blocked_id;

  -- Check if blocker is a provider
  SELECT role INTO blocker_role FROM profiles WHERE id = NEW.blocker_id;
  RAISE NOTICE 'Blocker role: %', blocker_role;

  -- Only auto-reject if a provider is blocking a seeker
  IF blocker_role = 'provider' THEN
    -- Reject all non-final applications
    -- Only exclude 'rejected' and 'withdrawn' (already final states)
    -- This now includes: new, docs_needed, under_review, interview_scheduled, approved, waitlisted, completed
    WITH updated AS (
      UPDATE applications
      SET
        status = 'rejected',
        updated_at = NOW(),
        notes = COALESCE(notes || E'\n\n', '') || 'Auto-rejected: Provider blocked applicant'
      WHERE
        seeker_id = NEW.blocked_id
        AND listing_id IN (
          SELECT id FROM listings WHERE provider_id = NEW.blocker_id
        )
        AND status NOT IN ('rejected', 'withdrawn')  -- Only exclude already-final states
      RETURNING *
    )
    SELECT COUNT(*) INTO affected_count FROM updated;

    RAISE NOTICE 'Auto-rejected % applications for blocked seeker', affected_count;
  ELSE
    RAISE NOTICE 'Blocker is not a provider (role: %), skipping auto-rejection', blocker_role;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- Verify
DO $$
BEGIN
  RAISE NOTICE 'Migration complete: Blocking trigger now rejects approved and completed applications';
END $$;
