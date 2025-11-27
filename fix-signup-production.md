# 🚨 PRODUCTION FIX: Signup Profile Creation Issue

## Problem
New users cannot sign up because the **profiles table is missing an INSERT policy** for Row Level Security (RLS). When a user tries to create an account:
1. Auth user is created ✅
2. Trigger tries to create profile ❌ **BLOCKED by RLS**
3. User is left with orphaned auth account (no profile)
4. Login fails because profile doesn't exist

**Error:** `new row violates row-level security policy for table "profiles"`

## Root Cause
The migration `20250103000002_rls_refinement.sql` defined SELECT and UPDATE policies but **forgot the INSERT policy**. Without it, even triggers with `SECURITY DEFINER` can't insert new profiles.

## Solution Overview

### What the Fix Does:
1. ✅ **Adds INSERT policy** - Allows authenticated users to create their own profile
2. ✅ **Adds service role INSERT policy** - Ensures triggers can always work
3. ✅ **Recreates trigger with SECURITY DEFINER** - Bypass RLS during signup
4. ✅ **Handles schema inconsistencies** - Works with both `id` and `user_id` columns
5. ✅ **Provides cleanup function** - Fixes any existing orphaned accounts

## How to Apply (2 Options)

### Option 1: Using Supabase CLI (Recommended)

From your project root:

```bash
# Make sure you're in the project root
cd /Users/neilrayamajhi/h2d

# Push the new migration to your cloud database
supabase db push
```

That's it! The migration will automatically apply.

### Option 2: Using Supabase Dashboard

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Navigate to **SQL Editor**
3. Open the file: `supabase/migrations/20251127000001_fix_profile_creation_rls.sql`
4. Copy all the contents
5. Paste into SQL Editor
6. Click **Run**

## After Applying the Fix

### 1. Fix Existing Orphaned Users

Run this in the SQL Editor to fix any users stuck without profiles:

```sql
SELECT * FROM fix_orphaned_auth_users();
```

This will show you all orphaned users and their fix status.

### 2. Verify the Fix

Test by creating a new account:

```bash
# In your app directory
cd app
npm start
```

Try signing up with a new email. It should work now!

### 3. Check RLS Policies

Verify the policies are correct:

```sql
SELECT 
  schemaname,
  tablename, 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;
```

You should see:
- ✅ 2 SELECT policies (own profile + admin)
- ✅ 2 INSERT policies (own profile + service role) **← NEW**
- ✅ 2 UPDATE policies (own profile + admin)

## What Changed

### Before (Broken)
```sql
-- Only had SELECT and UPDATE policies
-- No INSERT policy = signup fails
```

### After (Fixed)
```sql
-- Added INSERT policies
CREATE POLICY "Users can create own profile"
    ON profiles FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid() OR user_id = auth.uid());

CREATE POLICY "Service role can insert profiles"
    ON profiles FOR INSERT
    TO service_role
    WITH CHECK (true);
```

## Technical Details (For Learning)

### What is RLS?
**Row Level Security (RLS)** is like a security guard at the database level. It controls who can see, create, update, or delete rows in a table.

### Why Did This Break?
Think of RLS policies like this:
- **SELECT policy** = "Who can READ data?"
- **INSERT policy** = "Who can CREATE data?"
- **UPDATE policy** = "Who can MODIFY data?"

The previous migration only defined SELECT and UPDATE, but forgot INSERT. It's like having a door with a lock but no key to open it!

### What is SECURITY DEFINER?
Triggers normally run with the permissions of the user who triggered them. But `SECURITY DEFINER` is like giving the trigger a "master key" - it runs with elevated permissions and can bypass RLS policies.

### Why Do We Need Both?
1. **INSERT policy** - For when users manually create their profile (or app code does)
2. **SECURITY DEFINER trigger** - For automatic profile creation during signup

Both work together to ensure profiles are always created.

## Troubleshooting

### Problem: Migration fails with "column does not exist"
**Cause:** Your profiles table might use `id` instead of `user_id` (or vice versa)
**Solution:** The migration auto-detects this! Just re-run it.

### Problem: Still can't sign up after applying fix
**Check:**
1. Run `SELECT * FROM pg_policies WHERE tablename = 'profiles';` - Should show INSERT policies
2. Run `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';` - Should exist
3. Check Supabase logs in Dashboard → Logs

### Problem: Orphaned user still can't login
**Solution:**
```sql
-- Find the orphaned user ID from error logs, then:
SELECT * FROM fix_orphaned_auth_users();

-- Or manually fix one specific user:
INSERT INTO public.profiles (id, email, full_name, username, role, is_verified, created_at, updated_at)
VALUES (
  'user-id-here'::uuid,
  'their-email@example.com',
  'User Name',
  'username123',
  'seeker',
  false,
  NOW(),
  NOW()
);
```

## Prevention

To prevent this in the future:
1. ✅ **Always define all CRUD policies** - SELECT, INSERT, UPDATE, DELETE
2. ✅ **Test signup after schema changes** - Don't just test on existing accounts
3. ✅ **Use SECURITY DEFINER for triggers** - Ensures they always work

## Key Takeaways

1. **RLS is powerful but can break things** if policies are incomplete
2. **Always test the full user flow** - signup, login, profile access
3. **Triggers need SECURITY DEFINER** to bypass RLS when appropriate
4. **Database security** requires thinking about every operation type

## Need Help?

If this fix doesn't work:
1. Check the Supabase logs (Dashboard → Logs)
2. Share the error message
3. Run: `SELECT * FROM pg_policies WHERE tablename = 'profiles';`
4. Share the output

---

**Status:** ✅ Production-ready fix
**Impact:** Fixes signup for ALL new users
**Risk:** Low (adds policies, doesn't modify existing data)
**Rollback:** Can drop the new policies if needed (not recommended)

