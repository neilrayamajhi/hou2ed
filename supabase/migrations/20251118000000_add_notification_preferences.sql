-- Add notification preferences to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT true;

-- Add comment to explain the columns
COMMENT ON COLUMN profiles.push_notifications_enabled IS 'Whether user wants to receive push notifications';
COMMENT ON COLUMN profiles.email_notifications_enabled IS 'Whether user wants to receive email notifications';

