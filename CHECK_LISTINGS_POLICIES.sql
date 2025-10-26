-- Check what RLS policies are actually applied to listings table
SELECT policyname, cmd, qual::text as using_clause
FROM pg_policies
WHERE tablename = 'listings';
