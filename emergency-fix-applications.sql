-- EMERGENCY FIX: Make applications table temporarily permissive
-- Use this to test if RLS is the issue, then apply proper policies

-- Option 1: Completely disable RLS (TEMPORARY - for testing only!)
ALTER TABLE applications DISABLE ROW LEVEL SECURITY;

-- After testing, you can re-enable with:
-- ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Option 2: If you want to keep RLS but make it very permissive:
/*
-- Drop all existing policies
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'applications'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON applications', pol.policyname);
    END LOOP;
END $$;

-- Create a single permissive policy for all authenticated users
CREATE POLICY "allow_all_authenticated"
ON applications
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Grant permissions
GRANT ALL ON applications TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
*/