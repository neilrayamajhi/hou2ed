# 🔧 Fix for Signup Timeout Issue

## Problem Summary
The signup flow is timing out (504 error) after 35+ seconds because there's a database trigger on the `auth.users` table that tries to automatically create a profile but hangs.

## Root Cause
- There's a trigger function (likely `handle_new_user`) that fires when a user is inserted into `auth.users`
- This trigger tries to create a corresponding row in the `profiles` table
- The trigger is hanging/timing out, possibly due to:
  - RLS (Row Level Security) policies blocking the operation
  - Missing required fields in the trigger function
  - Infinite retry loop in the trigger logic

## Solutions (in order of preference)

### Solution 1: Disable the Trigger in Supabase Dashboard (RECOMMENDED)

**This is the cleanest fix - do this first:**

1. Go to: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/editor
2. Click on "SQL Editor" in the left sidebar
3. Run this SQL to find the trigger:

```sql
-- Find all triggers on auth.users
SELECT
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
AND event_object_table = 'users';
```

4. Once you find the trigger name (probably something like `on_auth_user_created`), disable it:

```sql
-- Replace 'trigger_name_here' with the actual trigger name
DROP TRIGGER IF EXISTS trigger_name_here ON auth.users;
```

5. After disabling the trigger, create profiles manually in your app code (see Solution 2)

### Solution 2: Client-Side Workaround (Already Implemented)

Your app already handles the 504 timeout gracefully at line 414-420 of `auth.service.ts`:

```typescript
// Check for 504 Gateway Timeout - Supabase server issue
if (error.status === 504 || error.message?.includes("504")) {
  console.error("Supabase server timeout - likely a broken database trigger");
  return {
    success: false,
    error: "Server timeout - The signup service is currently experiencing issues. Please try again later or contact support.",
    errorCode: "SERVER_TIMEOUT",
  };
}
```

However, we need to enhance this to:
1. Still create the user (which happens despite the timeout)
2. Manually create the profile after

### Solution 3: Manual User Creation Script (For Testing)

Use the script I created to manually create users:

```bash
node create-manual-signup.js
```

This bypasses the trigger entirely by using the admin API.

### Solution 4: Fix the Trigger Function (Long-term)

If you want to keep automatic profile creation, fix the trigger:

```sql
-- Drop the broken trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create a better trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Only create profile if it doesn't exist
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    username,
    role,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'role', 'seeker'),
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING; -- Don't fail if profile exists

  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the signup
    RAISE WARNING 'Error creating profile: %', SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

## Immediate Action Items

1. **Go to Supabase Dashboard NOW** and run the SQL to find and disable the trigger
2. **Test signup** after disabling the trigger - it should work instantly
3. **Update your app** to manually create profiles after successful signup (if needed)

## Test After Fix

Run this to verify the fix worked:

```bash
node test-auth-flow.js
```

The signup should complete in under 2 seconds instead of timing out.