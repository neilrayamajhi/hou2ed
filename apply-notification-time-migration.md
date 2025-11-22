# Apply Notification Time Migration

The `notification_time` column needs to be added to your database. Here are two ways to do it:

## Option 1: Via Supabase Dashboard (Easiest)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in the left sidebar
4. Click "New Query"
5. Paste this SQL:

```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS notification_time TIME DEFAULT NULL;

COMMENT ON COLUMN profiles.notification_time IS 'Time of day when user wants to receive daily notifications (HH:MM:SS format)';
```

6. Click "Run" (or press Cmd/Ctrl + Enter)
7. You should see "Success. No rows returned"

## Option 2: Via Supabase CLI

If you have the Supabase CLI installed:

```bash
supabase db push
```

This will apply all pending migrations in the `supabase/migrations` folder.

## Verify It Worked

After running the migration, reload your app and try setting a notification time again. You should see:
- The time persists when you reload the app
- No errors in the console about missing columns
