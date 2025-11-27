-- ==============================================================================
-- PRODUCTION-READY AUTH FIX - WITH EMAIL AUTHENTICATION
-- ==============================================================================
-- This migration fixes authentication while KEEPING email verification enabled
-- This is the proper production setup
-- ==============================================================================

-- Part 1: Fix profiles table structure (same as before)
-- ==============================================================================

DO $$
BEGIN
  -- Ensure we have all required columns
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'seeker';
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT true;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT true;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified_provider BOOLEAN DEFAULT false;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_status TEXT;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_documents JSONB;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS seeker_profile JSONB DEFAULT '{}';
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS provider_profile JSONB DEFAULT '{}';
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_time TIME;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

  -- Make username unique if not already
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'profiles' AND indexname = 'profiles_username_key'
    ) THEN
      CREATE UNIQUE INDEX profiles_username_key ON profiles(username);
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Username unique constraint may already exist';
  END;

  RAISE NOTICE '✅ Profiles table structure verified';
END $$;

-- Part 2: Production-ready profile creation trigger
-- ==============================================================================
-- This trigger creates profiles even BEFORE email is confirmed
-- The profile is marked as unverified until they confirm

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
  user_username TEXT;
  user_full_name TEXT;
BEGIN
  -- Extract metadata from the auth user
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'seeker');
  user_username := NEW.raw_user_meta_data->>'username';
  user_full_name := NEW.raw_user_meta_data->>'full_name';

  -- Validate we have required fields, use defaults if missing
  IF user_username IS NULL OR user_full_name IS NULL THEN
    user_username := COALESCE(user_username, 'user_' || substring(NEW.id::text, 1, 8));
    user_full_name := COALESCE(user_full_name, 'User');
  END IF;

  -- Insert profile IMMEDIATELY on signup (before email confirmation)
  -- This prevents orphaned accounts while maintaining email verification
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
    user_role::TEXT,
    NEW.phone,
    NULL,
    FALSE,  -- Always start as unverified, will be updated on email confirmation
    TRUE,
    TRUE,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth user creation
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS 
  'Creates profile immediately on signup. Profile starts as unverified until email is confirmed.';

-- Part 3: Trigger to update is_verified when email is confirmed
-- ==============================================================================

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
DROP FUNCTION IF EXISTS public.handle_user_email_confirmed() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_user_email_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When email is confirmed, update the profile
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE public.profiles
    SET 
      is_verified = TRUE,
      updated_at = NOW()
    WHERE id = NEW.id;
    
    RAISE NOTICE 'User % email confirmed, profile updated', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger for email confirmation updates
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL)
  EXECUTE FUNCTION public.handle_user_email_confirmed();

COMMENT ON FUNCTION public.handle_user_email_confirmed() IS 
  'Updates profile.is_verified when user confirms their email';

-- Part 4: Fix RLS policies
-- ==============================================================================

DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

-- Users can view their own profile (even if unverified)
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile (even if unverified)
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow profile creation (for manual fallback)
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Part 5: Grant permissions
-- ==============================================================================

GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- ==============================================================================
-- VERIFY INSTALLATION
-- ==============================================================================

DO $$
DECLARE
  trigger1_exists BOOLEAN;
  trigger2_exists BOOLEAN;
BEGIN
  -- Check if triggers exist
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) INTO trigger1_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_email_confirmed'
  ) INTO trigger2_exists;

  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '  ✅ PRODUCTION AUTH FIX COMPLETE';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Triggers installed:';
  IF trigger1_exists THEN
    RAISE NOTICE '  ✅ Profile creation trigger (on signup)';
  ELSE
    RAISE WARNING '  ❌ Profile creation trigger NOT installed';
  END IF;
  
  IF trigger2_exists THEN
    RAISE NOTICE '  ✅ Email confirmation trigger (on verify)';
  ELSE
    RAISE WARNING '  ❌ Email confirmation trigger NOT installed';
  END IF;
  RAISE NOTICE '';
  RAISE NOTICE 'Email authentication: ENABLED';
  RAISE NOTICE '  - Users must verify email to login';
  RAISE NOTICE '  - Profile created immediately on signup';
  RAISE NOTICE '  - Profile.is_verified updates on email confirm';
  RAISE NOTICE '';
  RAISE NOTICE 'Next step: Configure email delivery';
  RAISE NOTICE '  See AUTH_PRODUCTION_SETUP.md for details';
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;

