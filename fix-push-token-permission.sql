-- ==============================================================================
-- FIX PUSH TOKEN STORAGE - Add Column to Profiles
-- ==============================================================================
-- The app is trying to save push tokens but the column doesn't exist
-- ==============================================================================

-- Add push_token column to profiles if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_push_token ON profiles(push_token) WHERE push_token IS NOT NULL;

-- Add expo_push_token as well (in case it's using that name)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS expo_push_token TEXT;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '  ✅ FIXED: Push Token Storage';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Added columns:';
  RAISE NOTICE '  ✅ profiles.push_token';
  RAISE NOTICE '  ✅ profiles.expo_push_token';
  RAISE NOTICE '';
  RAISE NOTICE 'Push notifications should work now!';
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;

