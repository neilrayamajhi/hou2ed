-- Fix Profile Creation RLS Issue
-- Adds missing INSERT policies to allow profile creation during signup

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;

-- Add INSERT policy for authenticated users
CREATE POLICY "Users can create own profile"
    ON profiles FOR INSERT 
    TO authenticated
    WITH CHECK (id = auth.uid() OR user_id = auth.uid());

-- Add INSERT policy for service role (used by triggers)
CREATE POLICY "Service role can insert profiles"
    ON profiles FOR INSERT 
    TO service_role
    WITH CHECK (true);

-- Recreate trigger with SECURITY DEFINER to bypass RLS
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id, email, full_name, username, role,
    phone, is_verified, push_notifications_enabled, 
    email_notifications_enabled, created_at, updated_at
  ) VALUES (
    NEW.id,
    LOWER(NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substring(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'seeker'),
    NEW.phone,
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
    RAISE WARNING 'Profile creation failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

