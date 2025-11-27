-- ============================================================================
-- PROFILES TABLE - BASE SCHEMA
-- ============================================================================
-- This must be the FIRST migration as all other tables reference profiles
-- Date: 2024-10-02 (predates other migrations)
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================================
-- CREATE PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'seeker' NOT NULL,
    phone TEXT,
    verified_provider BOOLEAN DEFAULT false,
    verification_status TEXT,
    verification_documents JSONB,
    seeker_profile JSONB DEFAULT '{}',
    provider_profile JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    push_token TEXT,
    notification_time TIME DEFAULT '08:00:00',
    is_verified BOOLEAN DEFAULT false,
    push_notifications_enabled BOOLEAN DEFAULT true,
    email_notifications_enabled BOOLEAN DEFAULT true,
    expo_push_token TEXT,
    CONSTRAINT profiles_role_check CHECK (role IN ('seeker', 'provider', 'admin'))
);

-- Add comments for documentation
COMMENT ON TABLE public.profiles IS 'User profiles extending auth.users with app-specific data';
COMMENT ON COLUMN public.profiles.id IS 'References auth.users.id - primary key';
COMMENT ON COLUMN public.profiles.push_token IS 'Expo push notification token for sending notifications';
COMMENT ON COLUMN public.profiles.notification_time IS 'User preferred time for receiving daily application notifications (in UTC)';

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_verified_provider ON public.profiles(verified_provider) WHERE verified_provider = true;

-- ============================================================================
-- ENABLE RLS
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- SELECT: Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());

-- SELECT: Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
    );

-- UPDATE: Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- UPDATE: Admins can update any profile
CREATE POLICY "Admins can update any profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
    );

-- DELETE: Users can delete their own profile
CREATE POLICY "Users can delete own profile"
    ON public.profiles
    FOR DELETE
    TO authenticated
    USING (id = auth.uid());

-- Service role has full access (for triggers and admin operations)
CREATE POLICY "Service role full access"
    ON public.profiles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- TRIGGER FUNCTION: Auto-create profile on auth.users INSERT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Insert profile - SECURITY DEFINER allows this to bypass RLS
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    username,
    role,
    phone,
    is_verified,
    push_notifications_enabled,
    email_notifications_enabled,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    LOWER(NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substring(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'seeker')::TEXT,
    NEW.phone,
    FALSE,
    TRUE,
    TRUE,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

  RAISE NOTICE 'Profile created for user: %', NEW.id;
  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail the auth user creation
  RAISE WARNING 'Failed to create profile for user %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a profile when a new user signs up. Uses SECURITY DEFINER to bypass RLS.';

-- ============================================================================
-- TRIGGER: Execute handle_new_user on auth.users INSERT
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- TRIGGER FUNCTION: Update updated_at on profile changes
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- TRIGGER FUNCTION: Update is_verified when email confirmed
-- ============================================================================

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

COMMENT ON FUNCTION public.handle_user_email_confirmed() IS 'Updates profile.is_verified when user confirms their email';

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;

CREATE TRIGGER on_auth_user_email_confirmed
    AFTER UPDATE OF email_confirmed_at ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_email_confirmed();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_updated_at() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_user_email_confirmed() TO service_role;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify the table was created
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
    ) THEN
        RAISE NOTICE '✓ profiles table created successfully';
    ELSE
        RAISE EXCEPTION '✗ profiles table creation failed';
    END IF;

    IF EXISTS (
        SELECT FROM information_schema.triggers
        WHERE event_object_table = 'users'
        AND trigger_schema = 'auth'
        AND trigger_name = 'on_auth_user_created'
    ) THEN
        RAISE NOTICE '✓ on_auth_user_created trigger created successfully';
    ELSE
        RAISE EXCEPTION '✗ on_auth_user_created trigger creation failed';
    END IF;
END $$;
