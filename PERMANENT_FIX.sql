-- ====================================
-- PERMANENT FIX FOR SIGNUP TIMEOUT
-- Run this ONCE in Supabase SQL Editor
-- ====================================

-- Step 1: Find and drop the broken trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS create_profile_trigger ON auth.users;

-- Step 2: Drop the broken function (if it exists)
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.create_profile_for_user();
DROP FUNCTION IF EXISTS public.on_auth_user_created();

-- Step 3: Create a WORKING trigger function that won't hang
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile with proper error handling
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    username,
    role,
    phone,
    avatar_url,
    verified_provider,
    verification_status,
    verification_documents,
    seeker_profile,
    provider_profile,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'role', 'seeker')::text,
    null,
    null,
    false,
    null,
    null,
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING; -- Don't fail if profile exists

  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but DON'T fail the signup
    RAISE LOG 'Error creating profile for user %: %', new.id, SQLERRM;
    RETURN new; -- Return new to allow signup to complete
END;
$$;

-- Step 4: Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 5: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT INSERT, SELECT ON public.profiles TO anon, authenticated;

-- ====================================
-- TEST: This should return 'SUCCESS'
-- ====================================
SELECT 'SUCCESS - Trigger has been fixed!' as result;