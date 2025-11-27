-- ==============================================================================
-- FIX INFINITE RECURSION IN PROFILES RLS POLICIES
-- ==============================================================================
-- The admin policies were causing infinite recursion by querying profiles
-- from within a profiles policy. This fixes it.
-- ==============================================================================

-- Drop ALL existing policies on profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Make sure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- FIXED POLICIES - No circular references
-- ==============================================================================

-- 1. Users can view their own profile (no recursion)
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- 2. Users can update their own profile (no recursion)
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 3. Users can insert their own profile (for manual fallback)
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- 4. Admins can view all profiles
-- FIXED: Use auth.jwt() instead of querying profiles
CREATE POLICY "profiles_select_admin"
  ON profiles FOR SELECT
  USING (
    (auth.jwt()->>'role')::text = 'admin'
    OR
    -- Fallback: check raw_user_meta_data for admin role
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

-- 5. Admins can update any profile
-- FIXED: Use auth.jwt() instead of querying profiles
CREATE POLICY "profiles_update_admin"
  ON profiles FOR UPDATE
  USING (
    (auth.jwt()->>'role')::text = 'admin'
    OR
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

-- ==============================================================================
-- VERIFICATION
-- ==============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '  ✅ FIXED: Infinite Recursion in Profiles Policies';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Policies updated:';
  RAISE NOTICE '  ✅ profiles_select_own - Users can view own profile';
  RAISE NOTICE '  ✅ profiles_update_own - Users can update own profile';
  RAISE NOTICE '  ✅ profiles_insert_own - Users can insert own profile';
  RAISE NOTICE '  ✅ profiles_select_admin - Admins can view all (no recursion)';
  RAISE NOTICE '  ✅ profiles_update_admin - Admins can update all (no recursion)';
  RAISE NOTICE '';
  RAISE NOTICE 'The circular reference has been removed.';
  RAISE NOTICE 'Your app should work now!';
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;

-- Show current policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

