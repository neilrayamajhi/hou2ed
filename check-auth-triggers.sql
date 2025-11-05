-- Check all triggers on auth.users table
SELECT
    t.trigger_name,
    t.event_manipulation,
    t.event_object_table,
    t.action_statement,
    t.action_timing
FROM information_schema.triggers t
WHERE t.event_object_schema = 'auth'
AND t.event_object_table = 'users'
ORDER BY t.trigger_name;

-- Check if there are any functions that might be triggers
SELECT
    p.proname AS function_name,
    n.nspname AS schema_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname LIKE '%user%'
AND n.nspname IN ('public', 'auth')
ORDER BY n.nspname, p.proname;