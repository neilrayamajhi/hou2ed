-- First, let's enable the triggers
ALTER TABLE blocks ENABLE TRIGGER auto_reject_on_provider_block;
ALTER TABLE blocks ENABLE TRIGGER cleanup_saved_on_block;

-- Now verify they are enabled
SELECT
  tgname as trigger_name,
  CASE
    WHEN tgenabled = 'O' THEN 'ENABLED ✅'
    WHEN tgenabled = 'D' THEN 'DISABLED ❌'
    ELSE 'UNKNOWN'
  END as status
FROM pg_trigger
WHERE tgname IN ('auto_reject_on_provider_block', 'cleanup_saved_on_block');
