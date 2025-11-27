-- ============================================================================
-- FIX: Profile Creation Blocked by RLS During Signup
-- ============================================================================
-- Problem: New users cannot sign up because RLS policies block profile INSERT
-- Solution: Add INSERT policy + ensure trigger uses SECURITY DEFINER
-- Date: 2024-11-27
-- ============================================================================

-- Part 1: Fix RLS Policies for Profiles Table
-- ============================================================================

-- Drop existing policies to start clean
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert during registration" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON profiles;

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SELECT Policies - Who can read profiles
-- ============================================================================

-- 1. Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    TO authenticated
    USING (
        id = auth.uid() 
        OR user_id = auth.uid()
    );

-- 2. Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
    ON profiles FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE (p.id = auth.uid() OR p.user_id = auth.uid())
            AND p.role = 'admin'
        )
    );

-- ============================================================================
-- INSERT Policies - Who can create profiles (CRITICAL FOR SIGNUP)
-- ============================================================================

-- 3. Allow authenticated users to create their OWN profile during signup
-- This is ESSENTIAL for the signup flow to work
CREATE POLICY "Users can create own profile"
    ON profiles FOR INSERT
    TO authenticated
    WITH CHECK (
        id = auth.uid() 
        OR user_id = auth.uid()
    );

-- 4. Service role can always insert (used by triggers and admin operations)
-- This ensures triggers with SECURITY DEFINER can bypass RLS
CREATE POLICY "Service role can insert profiles"
    ON profiles FOR INSERT
    TO service_role
    WITH CHECK (true);

-- ============================================================================
-- UPDATE Policies - Who can modify profiles
-- ============================================================================

-- 5. Users can update their own profile
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

-- 6. Admins can update any profile
CREATE POLICY "Admins can update any profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE (p.id = auth.uid() OR p.user_id = auth.uid())
            AND p.role = 'admin'
        )
    );

-- ============================================================================
-- Part 2: Recreate Profile Creation Trigger with SECURITY DEFINER
-- ============================================================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create bulletproof trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- This allows the function to bypass RLS policies
SET search_path = public, auth
AS $$
DECLARE
  user_role TEXT;
  user_username TEXT;
  user_full_name TEXT;
  profile_id_col TEXT;
BEGIN
  -- Extract metadata from the auth user
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'seeker');
  user_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    'user_' || substring(NEW.id::text, 1, 8)
  );
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    'User'
  );

  -- Check which column name the profiles table uses (id or user_id)
  -- This handles schema inconsistencies gracefully
  SELECT column_name INTO profile_id_col
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name IN ('id', 'user_id')
    AND is_nullable = 'NO'
  LIMIT 1;

  -- Insert profile using the correct column name
  IF profile_id_col = 'id' THEN
    INSERT INTO public.profiles (
      id,
      email,
      full_name,
      username,
      role,
      phone,
      avatar_url,
      is_verified,
      push_notifications_enabled,
      email_notifications_enabled,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      LOWER(NEW.email),
      user_full_name,
      user_username,
      user_role,
      NEW.phone,
      NULL,
      FALSE,
      TRUE,
      TRUE,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      updated_at = NOW();
  ELSIF profile_id_col = 'user_id' THEN
    INSERT INTO public.profiles (
      user_id,
      email,
      full_name,
      username,
      role,
      phone,
      avatar_url,
      is_verified,
      push_notifications_enabled,
      email_notifications_enabled,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      LOWER(NEW.email),
      user_full_name,
      user_username,
      user_role,
      NEW.phone,
      NULL,
      FALSE,
      TRUE,
      TRUE,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      email = EXCLUDED.email,
      updated_at = NOW();
  ELSE
    RAISE EXCEPTION 'Could not determine primary key column for profiles table';
  END IF;

  RAISE LOG 'Profile created successfully for user: %', NEW.id;
  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth user creation
    RAISE WARNING 'Failed to create profile for user %: % (SQLSTATE: %)', 
      NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add helpful comment
COMMENT ON FUNCTION public.handle_new_user() IS 
  'Automatically creates a profile for every new user. Uses SECURITY DEFINER to bypass RLS.';

-- ============================================================================
-- Part 3: Grant Necessary Permissions
-- ============================================================================

-- Ensure all roles can interact with profiles table appropriately
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- Grant execute permission on the trigger function
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- ============================================================================
-- Part 4: Clean up any orphaned auth users (optional but helpful)
-- ============================================================================

-- Function to fix orphaned users (auth users without profiles)
CREATE OR REPLACE FUNCTION fix_orphaned_auth_users()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  orphaned_user RECORD;
  profile_col TEXT;
BEGIN
  -- Determine the correct column name
  SELECT column_name INTO profile_col
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name IN ('id', 'user_id')
    AND is_nullable = 'NO'
  LIMIT 1;

  -- Find and fix orphaned users
  FOR orphaned_user IN (
    SELECT au.id, au.email, au.created_at, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.profiles p ON (
      CASE 
        WHEN profile_col = 'id' THEN au.id = p.id
        WHEN profile_col = 'user_id' THEN au.id = p.user_id
        ELSE FALSE
      END
    )
    WHERE p.id IS NULL OR p.user_id IS NULL
  ) LOOP
    BEGIN
      -- Create the missing profile
      IF profile_col = 'id' THEN
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
          orphaned_user.created_at,
          NOW()
        )
        ON CONFLICT (id) DO NOTHING;
      ELSIF profile_col = 'user_id' THEN
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
          orphaned_user.created_at,
          NOW()
        )
        ON CONFLICT (user_id) DO NOTHING;
      END IF;

      user_id := orphaned_user.id;
      email := orphaned_user.email;
      created_at := orphaned_user.created_at;
      status := 'FIXED';
      RETURN NEXT;
    EXCEPTION
      WHEN OTHERS THEN
        user_id := orphaned_user.id;
        email := orphaned_user.email;
        created_at := orphaned_user.created_at;
        status := 'FAILED: ' || SQLERRM;
        RETURN NEXT;
    END;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION fix_orphaned_auth_users() IS 
  'Finds auth users without profiles and creates profiles for them. Run this after applying the fix.';

-- ============================================================================
-- Part 5: Verification Query
-- ============================================================================

-- Run this query after migration to verify the fix worked:
-- SELECT * FROM fix_orphaned_auth_users();

-- To check if RLS policies are correct:
-- SELECT * FROM pg_policies WHERE tablename = 'profiles';

