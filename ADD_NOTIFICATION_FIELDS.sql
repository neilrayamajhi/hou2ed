-- Add push notification support to profiles and applications

-- 1. Add push_token column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_push_token ON profiles(push_token);

-- 2. Add last_notified_status column to applications table
-- This tracks what status we last notified the user about
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS last_notified_status TEXT;

-- Add index for faster queries when checking for updates
CREATE INDEX IF NOT EXISTS idx_applications_last_notified
ON applications(seeker_id, status, last_notified_status);

-- Comment the columns for documentation
COMMENT ON COLUMN profiles.push_token IS 'Expo push notification token for sending notifications';
COMMENT ON COLUMN applications.last_notified_status IS 'Last application status that was sent via push notification';

-- Verify the changes
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'push_token';

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'applications' AND column_name = 'last_notified_status';
