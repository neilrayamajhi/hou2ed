-- Fix RLS policies for blocks table to allow blocking to work properly

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can create blocks" ON blocks;
DROP POLICY IF EXISTS "Users can view their blocks" ON blocks;
DROP POLICY IF EXISTS "Users can delete their blocks" ON blocks;
DROP POLICY IF EXISTS "Users can check if blocked" ON blocks;

-- Enable RLS on blocks table
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can insert blocks (create blocks)
CREATE POLICY "Users can create blocks"
ON blocks
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = blocker_id);

-- Policy 2: Users can view blocks they created (blocker can see who they blocked)
CREATE POLICY "Users can view their blocks"
ON blocks
FOR SELECT
TO authenticated
USING (auth.uid() = blocker_id);

-- Policy 3: Users can check if THEY are blocked (blocked user can see if blocked)
-- This is CRITICAL for the application prevention check to work
CREATE POLICY "Users can check if blocked"
ON blocks
FOR SELECT
TO authenticated
USING (auth.uid() = blocked_id);

-- Policy 4: Users can check blocks for application validation
-- This allows checking if a provider has blocked a seeker during application
CREATE POLICY "Allow checking blocks for applications"
ON blocks
FOR SELECT
TO authenticated
USING (true);

-- Policy 5: Users can delete blocks they created (unblock)
CREATE POLICY "Users can delete their blocks"
ON blocks
FOR DELETE
TO authenticated
USING (auth.uid() = blocker_id);

-- Create index for faster block lookups
CREATE INDEX IF NOT EXISTS idx_blocks_blocker_blocked
ON blocks(blocker_id, blocked_id);

CREATE INDEX IF NOT EXISTS idx_blocks_blocked_blocker
ON blocks(blocked_id, blocker_id);
