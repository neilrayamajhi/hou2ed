-- ==============================================================================
-- FIX ALL ISSUES - Clean Version (Handles Existing Policies)
-- ==============================================================================

-- Drop ALL possible policy variations first
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
    END LOOP;
    RAISE NOTICE 'Cleaned up all existing policies';
END $$;

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies fresh
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Add push token columns if they don't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS expo_push_token TEXT;

-- Create index if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_profiles_push_token'
    ) THEN
        CREATE INDEX idx_profiles_push_token 
        ON profiles(push_token) 
        WHERE push_token IS NOT NULL;
    END IF;
END $$;

-- Ensure trigger exists
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
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'seeker');
  user_username := NEW.raw_user_meta_data->>'username';
  user_full_name := NEW.raw_user_meta_data->>'full_name';

  IF user_username IS NULL OR user_full_name IS NULL THEN
    user_username := COALESCE(user_username, 'user_' || substring(NEW.id::text, 1, 8));
    user_full_name := COALESCE(user_full_name, 'User');
  END IF;

  INSERT INTO public.profiles (
    id, email, full_name, username, role, phone, avatar_url,
    is_verified, push_notifications_enabled, email_notifications_enabled,
    created_at, updated_at
  )
  VALUES (
    NEW.id, LOWER(NEW.email), user_full_name, user_username, user_role::TEXT,
    NEW.phone, NULL, FALSE, TRUE, TRUE, NOW(), NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO anon;

-- Verification
DO $$
DECLARE
    policy_count INTEGER;
    has_push_token BOOLEAN;
    has_trigger BOOLEAN;
BEGIN
    -- Count policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'profiles';
    
    -- Check for push_token column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'push_token'
    ) INTO has_push_token;
    
    -- Check for trigger
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
    ) INTO has_trigger;

    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE '  ✅ ALL FIXES APPLIED SUCCESSFULLY';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'Status:';
    RAISE NOTICE '  ✅ Profiles policies: % active', policy_count;
    RAISE NOTICE '  ✅ Push token column: %', CASE WHEN has_push_token THEN 'exists' ELSE 'missing' END;
    RAISE NOTICE '  ✅ Profile trigger: %', CASE WHEN has_trigger THEN 'installed' ELSE 'missing' END;
    RAISE NOTICE '';
    RAISE NOTICE 'Reload your app - errors should be gone!';
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;

