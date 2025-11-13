-- Create a function to soft delete applications
-- This handles the deleted_at column that may not be in TypeScript types

CREATE OR REPLACE FUNCTION soft_delete_application(application_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE applications
  SET
    deleted_at = NOW(),
    status = 'withdrawn'
  WHERE id = application_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION soft_delete_application TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION soft_delete_application IS 'Soft deletes an application by setting deleted_at timestamp and status to withdrawn';