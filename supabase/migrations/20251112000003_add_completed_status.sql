-- Add 'completed' status to applications
-- Allows providers to mark stays as finished, enabling seekers to reapply

BEGIN;

-- Check if there's a status constraint and update it
DO $$
BEGIN
  -- Try to drop existing status constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'applications_status_check'
    AND conrelid = 'applications'::regclass
  ) THEN
    ALTER TABLE applications DROP CONSTRAINT applications_status_check;

    -- Recreate with 'completed' included
    ALTER TABLE applications ADD CONSTRAINT applications_status_check
      CHECK (status IN (
        'draft',
        'new',
        'submitted',
        'docs_needed',
        'under_review',
        'interview_scheduled',
        'approved',
        'rejected',
        'waitlisted',
        'withdrawn',
        'completed'
      ));

    RAISE NOTICE 'Updated applications_status_check constraint to include completed status';
  ELSE
    RAISE NOTICE 'No status constraint found - status column likely uses text type without constraint';
  END IF;
END $$;

COMMIT;

-- Add documentation
COMMENT ON COLUMN applications.status IS 'Application status. Completed status indicates a finished stay, allowing the seeker to reapply.';

-- Verify
DO $$
BEGIN
  RAISE NOTICE 'Migration complete: completed status is now available for applications';
END $$;
