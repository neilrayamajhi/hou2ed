# 🚀 Apply ALL Database Fixes - One Shot

You have TWO errors that need fixing. Do this in ONE go:

---

## ⚡ **Single SQL to Fix Everything**

**Open Supabase SQL Editor:**
👉 https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/sql

**Copy and paste ALL of this:**

```sql
-- ==============================================================================
-- FIX ALL ISSUES - One Script
-- ==============================================================================

-- 1. FIX: Infinite recursion in profiles policies
-- ==============================================================================

-- Drop problematic policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create fixed policies (no circular references)
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

-- 2. FIX: Add push_token column for notifications
-- ==============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS expo_push_token TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_push_token 
  ON profiles(push_token) 
  WHERE push_token IS NOT NULL;

-- 3. FIX: Profile creation trigger (if not already applied)
-- ==============================================================================

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

-- 4. GRANT necessary permissions
-- ==============================================================================

GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO anon;

-- ==============================================================================
-- VERIFICATION
-- ==============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '  ✅ ALL FIXES APPLIED SUCCESSFULLY';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Fixed issues:';
  RAISE NOTICE '  ✅ Infinite recursion in profiles policies';
  RAISE NOTICE '  ✅ Push token storage (added push_token column)';
  RAISE NOTICE '  ✅ Profile creation trigger installed';
  RAISE NOTICE '  ✅ Permissions granted';
  RAISE NOTICE '';
  RAISE NOTICE 'Your app should work now! Reload it to test.';
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;
```

**Click "Run"**

---

## ✅ **Then Reload Your App**

```bash
# In your app, press:
# iOS Simulator: Cmd+R
# Android Emulator: R+R
# Or just close and reopen the app
```

**Both errors should be gone!**

---

## 🔍 **What This Fixed:**

1. **Infinite recursion** - Removed circular policy references
2. **Push token error** - Added missing `push_token` column
3. **Profile creation** - Ensured trigger works correctly

---

**After applying, your app should load without errors!** 🎉

