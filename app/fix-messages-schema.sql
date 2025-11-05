-- Fix messages table schema - application_id should be nullable for general messaging
ALTER TABLE messages
ALTER COLUMN application_id DROP NOT NULL;

-- Verify the change
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'messages'
  AND column_name = 'application_id';