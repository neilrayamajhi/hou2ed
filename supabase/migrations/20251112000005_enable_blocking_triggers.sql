-- Enable the blocking triggers that were disabled
-- This fixes the auto-rejection not working

BEGIN;

-- Enable the auto-rejection trigger on blocks table
ALTER TABLE blocks ENABLE TRIGGER auto_reject_on_provider_block;

-- Enable the saved listings cleanup trigger
ALTER TABLE blocks ENABLE TRIGGER cleanup_saved_on_block;

-- Verify triggers are enabled
DO $$
DECLARE
  auto_reject_enabled BOOLEAN;
  cleanup_enabled BOOLEAN;
BEGIN
  -- Check auto_reject trigger
  SELECT tgenabled = 'O' INTO auto_reject_enabled
  FROM pg_trigger
  WHERE tgname = 'auto_reject_on_provider_block';

  -- Check cleanup trigger
  SELECT tgenabled = 'O' INTO cleanup_enabled
  FROM pg_trigger
  WHERE tgname = 'cleanup_saved_on_block';

  IF auto_reject_enabled THEN
    RAISE NOTICE '✅ auto_reject_on_provider_block trigger is ENABLED';
  ELSE
    RAISE NOTICE '❌ auto_reject_on_provider_block trigger is still DISABLED';
  END IF;

  IF cleanup_enabled THEN
    RAISE NOTICE '✅ cleanup_saved_on_block trigger is ENABLED';
  ELSE
    RAISE NOTICE '❌ cleanup_saved_on_block trigger is still DISABLED';
  END IF;
END $$;

COMMIT;
