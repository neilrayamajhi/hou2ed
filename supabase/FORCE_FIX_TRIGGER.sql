-- FORCE FIX: Drop and recreate the trigger function with correct logic
-- Run this to ensure the function has the updated code

BEGIN;

-- Drop the existing function
DROP FUNCTION IF EXISTS auto_reject_blocked_seeker_applications() CASCADE;

-- Recreate with the CORRECT logic (no 'approved' in exclusion list)
CREATE OR REPLACE FUNCTION auto_reject_blocked_seeker_applications()
RETURNS TRIGGER AS $$
DECLARE
  blocker_role TEXT;
  affected_count INTEGER;
BEGIN
  -- Debug: Log when trigger fires
  RAISE NOTICE '[TRIGGER] Block created: blocker_id=%, blocked_id=%', NEW.blocker_id, NEW.blocked_id;

  -- Check if blocker is a provider
  SELECT role INTO blocker_role FROM profiles WHERE id = NEW.blocker_id;
  RAISE NOTICE '[TRIGGER] Blocker role: %', blocker_role;

  -- Only auto-reject if a provider is blocking a seeker
  IF blocker_role = 'provider' THEN
    -- Reject ALL non-final applications (only exclude rejected/withdrawn)
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
        AND status NOT IN ('rejected', 'withdrawn')  -- ONLY exclude final states
      RETURNING *
    )
    SELECT COUNT(*) INTO affected_count FROM updated;

    RAISE NOTICE '[TRIGGER] Auto-rejected % applications', affected_count;
  ELSE
    RAISE NOTICE '[TRIGGER] Blocker is not a provider, skipping auto-rejection';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS auto_reject_on_provider_block ON blocks;
CREATE TRIGGER auto_reject_on_provider_block
  AFTER INSERT ON blocks
  FOR EACH ROW
  EXECUTE FUNCTION auto_reject_blocked_seeker_applications();

COMMIT;

-- Verify the trigger was created
SELECT
  tgname as trigger_name,
  CASE
    WHEN tgenabled = 'O' THEN 'ENABLED ✅'
    WHEN tgenabled = 'D' THEN 'DISABLED ❌'
    ELSE 'UNKNOWN'
  END as status,
  tgtype as trigger_type
FROM pg_trigger
WHERE tgname = 'auto_reject_on_provider_block';

-- Show a test scenario
DO $$
BEGIN
  RAISE NOTICE '=== TRIGGER INSTALLED ===';
  RAISE NOTICE 'Next time you INSERT into blocks table, you should see [TRIGGER] logs above';
  RAISE NOTICE 'To test: Find a provider and seeker ID, then run:';
  RAISE NOTICE 'INSERT INTO blocks (blocker_id, blocked_id) VALUES (''provider_id'', ''seeker_id'');';
END $$;
