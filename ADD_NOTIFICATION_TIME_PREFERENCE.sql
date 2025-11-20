-- Add notification time preference to profiles table
-- This allows users to choose when they want to receive daily notifications

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS notification_time TIME DEFAULT '08:00:00';

-- Add comment explaining the field
COMMENT ON COLUMN profiles.notification_time IS 'User preferred time for receiving daily application notifications (in UTC)';

-- Index for efficient lookups when checking which users to notify each hour
CREATE INDEX IF NOT EXISTS idx_profiles_notification_time
ON profiles(notification_time)
WHERE push_token IS NOT NULL;
