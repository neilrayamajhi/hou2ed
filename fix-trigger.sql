-- Check for triggers on auth.users table
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
AND event_object_table = 'users';

-- Check for the handle_new_user function
SELECT
    proname AS function_name,
    pg_get_functiondef(oid) AS function_definition
FROM pg_proc
WHERE proname LIKE '%user%'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
LIMIT 5;

-- List all triggers
SELECT
    tgname AS trigger_name,
    tgrelid::regclass AS table_name,
    tgtype,
    tgenabled
FROM pg_trigger
WHERE tgrelid::regclass::text LIKE '%user%'
AND NOT tgisinternal;