-- Create blocks table for user blocking functionality
-- Similar to Instagram blocking: bidirectional blocking prevents all interactions

CREATE TABLE IF NOT EXISTS blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure a user can't block someone twice
  UNIQUE(blocker_id, blocked_id),
  
  -- Ensure a user can't block themselves
  CHECK (blocker_id != blocked_id)
);

-- Add indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_blocks_blocker_id ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked_id ON blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_blocks_both ON blocks(blocker_id, blocked_id);

-- Add RLS policies for blocks table
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

-- Users can see blocks they created (who they blocked)
CREATE POLICY "Users can view their own blocks"
  ON blocks
  FOR SELECT
  USING (auth.uid() = blocker_id);

-- Users can create blocks (block others)
CREATE POLICY "Users can create blocks"
  ON blocks
  FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

-- Users can delete their blocks (unblock others)
CREATE POLICY "Users can delete their own blocks"
  ON blocks
  FOR DELETE
  USING (auth.uid() = blocker_id);

-- Add helpful comments
COMMENT ON TABLE blocks IS 'Stores user blocking relationships - bidirectional blocking like Instagram';
COMMENT ON COLUMN blocks.blocker_id IS 'User who initiated the block';
COMMENT ON COLUMN blocks.blocked_id IS 'User who is being blocked';

-- Helper function to check if user A has blocked user B OR user B has blocked user A
CREATE OR REPLACE FUNCTION is_blocked(user_a UUID, user_b UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blocks
    WHERE (blocker_id = user_a AND blocked_id = user_b)
       OR (blocker_id = user_b AND blocked_id = user_a)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_blocked IS 'Check if two users have a blocking relationship (either direction)';

