-- Create blocks table for user blocking functionality
-- Allows providers to block seekers (auto-rejects applications)
-- Allows seekers to block providers (hides listings)

CREATE TABLE blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent self-blocking and duplicate blocks
  CONSTRAINT no_self_block CHECK (blocker_id != blocked_id),
  CONSTRAINT unique_block UNIQUE (blocker_id, blocked_id)
);

-- Indexes for fast lookups
CREATE INDEX idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX idx_blocks_blocked ON blocks(blocked_id);

-- Enable RLS
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for blocks table
-- Users can view their own blocks (who they blocked)
CREATE POLICY "Users can view their own blocks"
  ON blocks FOR SELECT
  USING (auth.uid() = blocker_id);

-- Users can create blocks
CREATE POLICY "Users can block others"
  ON blocks FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

-- Users can delete their own blocks (unblock)
CREATE POLICY "Users can unblock others"
  ON blocks FOR DELETE
  USING (auth.uid() = blocker_id);

-- ============================================================================
-- Database Functions
-- ============================================================================

-- Function: Check if user is blocked
CREATE OR REPLACE FUNCTION is_user_blocked(blocker UUID, blocked UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM blocks
    WHERE blocker_id = blocker AND blocked_id = blocked
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function: Auto-reject applications when provider blocks seeker
CREATE OR REPLACE FUNCTION auto_reject_blocked_seeker_applications()
RETURNS TRIGGER AS $$
DECLARE
  blocker_role TEXT;
BEGIN
  -- Check if blocker is a provider
  SELECT role INTO blocker_role FROM profiles WHERE id = NEW.blocker_id;

  -- Only auto-reject if a provider is blocking a seeker
  IF blocker_role = 'provider' THEN
    UPDATE applications
    SET
      status = 'rejected',
      updated_at = NOW()
    WHERE
      seeker_id = NEW.blocked_id
      AND listing_id IN (
        SELECT id FROM listings WHERE provider_id = NEW.blocker_id
      )
      AND status NOT IN ('rejected', 'withdrawn', 'approved');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Auto-reject applications when provider blocks seeker
CREATE TRIGGER auto_reject_on_provider_block
  AFTER INSERT ON blocks
  FOR EACH ROW
  EXECUTE FUNCTION auto_reject_blocked_seeker_applications();

-- Function: Cleanup saved listings when user blocks provider
CREATE OR REPLACE FUNCTION cleanup_saved_listings_on_block()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM saved_listings
  WHERE user_id = NEW.blocker_id
    AND listing_id IN (
      SELECT id FROM listings WHERE provider_id = NEW.blocked_id
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Cleanup saved listings on block
CREATE TRIGGER cleanup_saved_on_block
  AFTER INSERT ON blocks
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_saved_listings_on_block();

-- ============================================================================
-- Update RLS Policies for Existing Tables
-- ============================================================================

-- LISTINGS: Hide listings from blocked providers
-- Note: This adds to existing listing visibility policies
CREATE POLICY "Hide listings from blocked providers"
  ON listings FOR SELECT
  USING (
    -- User has not blocked this provider
    NOT EXISTS (
      SELECT 1 FROM blocks
      WHERE blocker_id = auth.uid() AND blocked_id = listings.provider_id
    )
    -- Provider has not blocked this user
    AND NOT EXISTS (
      SELECT 1 FROM blocks
      WHERE blocker_id = listings.provider_id AND blocked_id = auth.uid()
    )
  );

-- APPLICATIONS: Prevent applications to/from blocked users
CREATE POLICY "Cannot apply to blocked providers"
  ON applications FOR INSERT
  WITH CHECK (
    -- Seeker hasn't blocked the provider
    NOT EXISTS (
      SELECT 1 FROM blocks b
      JOIN listings l ON l.provider_id = b.blocked_id
      WHERE b.blocker_id = auth.uid()
        AND l.id = applications.listing_id
    )
    -- Provider hasn't blocked the seeker
    AND NOT EXISTS (
      SELECT 1 FROM blocks b
      JOIN listings l ON l.provider_id = b.blocker_id
      WHERE b.blocked_id = auth.uid()
        AND l.id = applications.listing_id
    )
  );

-- MESSAGES: Prevent new messages to/from blocked users
-- Only create this policy if both messages and threads tables exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'messages' AND table_schema = 'public'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'threads' AND table_schema = 'public'
  ) THEN
    -- Create policy to prevent messaging blocked users
    EXECUTE 'CREATE POLICY "Cannot message blocked users"
      ON messages FOR INSERT
      WITH CHECK (
        -- Check if sender is blocked by receiver or vice versa
        NOT EXISTS (
          SELECT 1 FROM blocks b
          JOIN threads t ON t.id = messages.thread_id
          WHERE (
            (b.blocker_id = auth.uid() AND b.blocked_id = ANY(t.participants))
            OR (b.blocked_id = auth.uid() AND b.blocker_id = ANY(t.participants))
          )
          AND b.blocker_id != auth.uid() -- Don''t block if current user is the blocker
        )
      )';
  END IF;
END $$;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE blocks IS 'Stores user blocking relationships. Providers can block seekers (auto-rejects applications), seekers can block providers (hides listings).';
COMMENT ON COLUMN blocks.blocker_id IS 'User who initiated the block';
COMMENT ON COLUMN blocks.blocked_id IS 'User who is blocked';
COMMENT ON FUNCTION is_user_blocked IS 'Returns true if blocker has blocked the specified user';
COMMENT ON FUNCTION auto_reject_blocked_seeker_applications IS 'Automatically rejects active applications when provider blocks a seeker';
COMMENT ON FUNCTION cleanup_saved_listings_on_block IS 'Removes saved listings from blocked providers';
