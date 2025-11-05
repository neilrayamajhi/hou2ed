-- Add RPC function for batch updating read receipts
-- This optimizes the N+1 query issue when marking multiple messages as read

CREATE OR REPLACE FUNCTION add_user_to_read_by(
  p_message_ids UUID[],
  p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE messages
  SET read_by = array_append(
    array_remove(read_by, p_user_id),
    p_user_id
  )
  WHERE id = ANY(p_message_ids)
    AND NOT (p_user_id = ANY(read_by));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION add_user_to_read_by(UUID[], UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION add_user_to_read_by(UUID[], UUID) IS
'Batch update function to mark multiple messages as read by a user. Prevents duplicates in read_by array.';