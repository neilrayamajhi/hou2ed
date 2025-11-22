-- Add notification_time column to profiles table for daily reminder scheduling
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS notification_time TIME DEFAULT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN profiles.notification_time IS 'Time of day when user wants to receive daily notifications (HH:MM:SS format)';

