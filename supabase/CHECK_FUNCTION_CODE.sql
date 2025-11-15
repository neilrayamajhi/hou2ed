-- Check the actual function code to see if it has the updated logic
SELECT
  proname as function_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'auto_reject_blocked_seeker_applications';
