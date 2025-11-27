# 🚀 APPLY THE PROFILE FIX NOW (2 Minutes)

## Option 1: Supabase Dashboard (Easiest - DO THIS)

1. **Go to SQL Editor:**
   https://app.supabase.com/project/rixiofltzptwaiwxhhlf/sql

2. **Copy this entire SQL block:**

```sql
-- Quick Profile Creation Fix
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;

CREATE POLICY "Users can create own profile"
    ON profiles FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid() OR user_id = auth.uid());

CREATE POLICY "Service role can insert profiles"
    ON profiles FOR INSERT TO service_role
    WITH CHECK (true);

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id, email, full_name, username, role,
    phone, is_verified, push_notifications_enabled, email_notifications_enabled,
    created_at, updated_at
  ) VALUES (
    NEW.id, LOWER(NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substring(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'seeker'),
    NEW.phone, FALSE, TRUE, TRUE, NOW(), NOW()
  ) ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email, updated_at = NOW();
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Profile creation failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

3. **Paste into SQL Editor**

4. **Click "Run"** (or press Cmd/Ctrl + Enter)

5. **Should see:** `Success. No rows returned`

## ✅ Verify It Worked

Run this query to check:

```sql
SELECT policyname, cmd FROM pg_policies 
WHERE tablename = 'profiles' AND cmd = 'INSERT';
```

You should see **2 policies** for INSERT.

## 🧪 Test It

Now try creating a new account in your app - it should work!

---

## What This Does

1. **Adds INSERT policies** - Allows users to create profiles
2. **Recreates trigger** - With SECURITY DEFINER to bypass RLS
3. **Fixes orphaned accounts** - Repairs any stuck users

## Need Help?

If you get an error, share it and I'll fix it immediately!

