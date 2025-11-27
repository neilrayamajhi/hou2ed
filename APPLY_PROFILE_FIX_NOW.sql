-- ============================================================================
-- IMMEDIATE FIX: Profile Creation RLS Issue
-- ============================================================================
-- Run this in Supabase SQL Editor to fix signup immediately
-- ============================================================================

-- Part 1: Add INSERT policies for profiles table
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- SELECT Policies
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    TO authenticated
    USING (
        id = auth.uid() 
        OR user_id = auth.uid()
    );

-- INSERT Policies (THIS IS THE CRITICAL FIX!)
CREATE POLICY "Users can create own profile"
    ON profiles FOR INSERT
    TO authenticated
    WITH CHECK (
        id = auth.uid() 
        OR user_id = auth.uid()
    );

CREATE POLICY "Service role can insert profiles"
    ON profiles FOR INSERT
    TO service_role
    WITH CHECK (true);

-- UPDATE Policies
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (
        id = auth.uid() 
        OR user_id = auth.uid()
    )
    WITH CHECK (
        id = auth.uid() 
        OR user_id = auth.uid()
    );

-- Part 2: Recreate trigger with SECURITY DEFINER
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_role TEXT;
  user_username TEXT;
  user_full_name TEXT;
BEGIN
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'seeker');
  user_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    'user_' || substring(NEW.id::text, 1, 8)
  );
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    'User'
  );

  -- Try inserting with user_id column (most common)
  BEGIN
    INSERT INTO public.profiles (
      user_id, email, full_name, username, role,
      phone, avatar_url, is_verified,
      push_notifications_enabled, email_notifications_enabled,
      created_at, updated_at
    ) VALUES (
      NEW.id, LOWER(NEW.email), user_full_name, user_username, user_role,
      NEW.phone, NULL, FALSE, TRUE, TRUE, NOW(), NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      email = EXCLUDED.email,
      updated_at = NOW();
    
    RETURN NEW;
  EXCEPTION
    WHEN undefined_column THEN
      -- If user_id doesn't exist, try with id column
      INSERT INTO public.profiles (
        id, email, full_name, username, role,
        phone, avatar_url, is_verified,
        push_notifications_enabled, email_notifications_enabled,
        created_at, updated_at
      ) VALUES (
        NEW.id, LOWER(NEW.email), user_full_name, user_username, user_role,
        NEW.phone, NULL, FALSE, TRUE, TRUE, NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();
      
      RETURN NEW;
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to create profile: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
      RETURN NEW;
  END;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Part 3: Grant permissions
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- Part 4: Fix any orphaned users
-- ============================================================================

DO $$
DECLARE
  orphaned_user RECORD;
BEGIN
  FOR orphaned_user IN (
    SELECT au.id, au.email, au.raw_user_meta_data, au.created_at
    FROM auth.users au
    LEFT JOIN public.profiles p ON (au.id = p.user_id OR au.id = p.id)
    WHERE p.user_id IS NULL AND p.id IS NULL
  ) LOOP
    BEGIN
      -- Try with user_id first
      INSERT INTO public.profiles (
        user_id, email, full_name, username, role,
        is_verified, push_notifications_enabled, email_notifications_enabled,
        created_at, updated_at
      ) VALUES (
        orphaned_user.id,
        LOWER(orphaned_user.email),
        COALESCE(orphaned_user.raw_user_meta_data->>'full_name', 'User'),
        COALESCE(
          orphaned_user.raw_user_meta_data->>'username',
          'user_' || substring(orphaned_user.id::text, 1, 8)
        ),
        COALESCE(orphaned_user.raw_user_meta_data->>'role', 'seeker'),
        FALSE, TRUE, TRUE,
        orphaned_user.created_at, NOW()
      );
      RAISE NOTICE 'Fixed orphaned user: %', orphaned_user.email;
    EXCEPTION
      WHEN undefined_column THEN
        -- Try with id column
        INSERT INTO public.profiles (
          id, email, full_name, username, role,
          is_verified, push_notifications_enabled, email_notifications_enabled,
          created_at, updated_at
        ) VALUES (
          orphaned_user.id,
          LOWER(orphaned_user.email),
          COALESCE(orphaned_user.raw_user_meta_data->>'full_name', 'User'),
          COALESCE(
            orphaned_user.raw_user_meta_data->>'username',
            'user_' || substring(orphaned_user.id::text, 1, 8)
          ),
          COALESCE(orphaned_user.raw_user_meta_data->>'role', 'seeker'),
          FALSE, TRUE, TRUE,
          orphaned_user.created_at, NOW()
        );
        RAISE NOTICE 'Fixed orphaned user: %', orphaned_user.email;
      WHEN OTHERS THEN
        RAISE WARNING 'Could not fix user %: %', orphaned_user.email, SQLERRM;
    END;
  END LOOP;
END $$;

-- Verification
-- ============================================================================

SELECT 'SUCCESS: Profile creation fix applied!' as status;
SELECT COUNT(*) as policies_created FROM pg_policies WHERE tablename = 'profiles' AND cmd = 'INSERT';
SELECT COUNT(*) as orphaned_users_remaining FROM auth.users au 
  LEFT JOIN public.profiles p ON (au.id = p.user_id OR au.id = p.id)
  WHERE p.user_id IS NULL AND p.id IS NULL;

