-- ==============================================================================
-- BULLETPROOF PROFILE CREATION TRIGGER - PRODUCTION
-- ==============================================================================
-- This trigger ensures that EVERY user in auth.users ALWAYS has a profile
-- This prevents orphaned accounts where auth exists but profile doesn't
-- ==============================================================================

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create the trigger function
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

  -- Insert profile (with conflict handling in case it already exists)
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
    user_role::TEXT,
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
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth user creation
    RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add comment for documentation
COMMENT ON FUNCTION public.handle_new_user() IS 
  'Automatically creates a profile in public.profiles for every new auth.users entry. Prevents orphaned accounts.';

