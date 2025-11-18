-- Add new application statuses to support enhanced application workflow
-- This migration adds: 'new', 'docs_needed', 'interview_scheduled', 'waitlisted'

-- First, we need to check if the applications table uses an enum type for status
-- If it does, we need to alter the enum; if not, we need to add a CHECK constraint

-- Drop the existing check constraint if it exists
ALTER TABLE applications
DROP CONSTRAINT IF EXISTS applications_status_check;

-- Add the new check constraint with all statuses
ALTER TABLE applications
ADD CONSTRAINT applications_status_check
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
  'withdrawn'
));

-- Update any existing 'submitted' applications to 'new' if they haven't been reviewed yet
-- (This is optional - comment out if you don't want to migrate existing data)
UPDATE applications
SET status = 'new'
WHERE status = 'submitted'
  AND reviewed_at IS NULL;

-- Add a comment to document the new statuses
COMMENT ON COLUMN applications.status IS
'Application status: draft (not submitted), new (just submitted), submitted (legacy), docs_needed (missing documents), under_review (being reviewed), interview_scheduled (interview pending), approved (accepted), rejected (denied), waitlisted (on waiting list), withdrawn (cancelled by applicant)';