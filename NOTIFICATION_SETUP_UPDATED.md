# Push Notification Setup Guide (User-Configurable Times)

This guide explains how to set up the hourly push notifications system where users can choose their preferred notification time.

## Overview

The notification system allows users to:
- Choose their preferred notification time (e.g., 8:00 AM, 3:00 PM, etc.)
- Receive daily push notifications at their chosen time
- Get notified when applications are **approved** or **rejected**
- Only receive notifications for status changes since the last notification

## Features

- ✅ User-configurable notification times
- ✅ Hourly cron job checks for users scheduled at that hour
- ✅ Only notifies on status changes (approved/rejected)
- ✅ Summary format: "You have 2 updates: 1 approved, 1 rejected"
- ✅ Manual test button in "My Applications" screen
- ✅ Tracks notification history to avoid duplicates
- ✅ Time picker UI in Profile Settings

## Prerequisites

1. **Expo Project ID** (optional for production push notifications)
   - Get it from `app.json` or Expo dashboard
   - Add to `.env.local`: `EXPO_PUBLIC_PROJECT_ID=your-project-id`
   - For development, local notifications work without this

2. **Supabase CLI**
   - Install: `npm install -g supabase`
   - Login: `supabase login`

## Step 1: Run Database Migration

Run this SQL in your Supabase SQL Editor to add the required fields:

```sql
-- Add push notification fields (from ADD_NOTIFICATION_FIELDS.sql)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS push_token TEXT;

ALTER TABLE applications
ADD COLUMN IF NOT EXISTS last_notified_status TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_push_token ON profiles(push_token);
CREATE INDEX IF NOT EXISTS idx_applications_last_notified
ON applications(seeker_id, status, last_notified_status);

-- Add notification time preference (from ADD_NOTIFICATION_TIME_PREFERENCE.sql)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS notification_time TIME DEFAULT '08:00:00';

-- Add comment explaining the field
COMMENT ON COLUMN profiles.notification_time IS 'User preferred time for receiving daily application notifications (in UTC)';

-- Index for efficient lookups when checking which users to notify each hour
CREATE INDEX IF NOT EXISTS idx_profiles_notification_time
ON profiles(notification_time)
WHERE push_token IS NOT NULL;
```

**Important**: The `notification_time` is stored in **UTC**. Users will select their local time in the app, but you should convert it to UTC for storage.

## Step 2: Test the UI

Before deploying the Edge Function, test that users can set their notification time:

1. **Open the app** and login
2. **Go to Profile** tab
3. **Scroll to "Account Settings"**
4. **Look for "Notification Time"** - it should show the current time (default: 8:00 AM)
5. **Tap on "Notification Time"**
6. **Select a new time** using the time picker
7. **Verify**: Check your database to confirm the time was saved:
   ```sql
   SELECT id, email, notification_time, push_token
   FROM profiles
   WHERE email = 'your-email@example.com';
   ```

## Step 3: Deploy Supabase Edge Function

### Option A: Using Supabase CLI (Recommended)

```bash
# Navigate to project root
cd path/to/hou2ed

# Link your Supabase project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
supabase functions deploy send-application-notifications

# Set up secrets (required for the function to work)
supabase secrets set SUPABASE_URL=your-supabase-url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Finding your values:**
- `YOUR_PROJECT_REF`: Found in Supabase Dashboard → Settings → General → Reference ID
- `SUPABASE_URL`: Found in Supabase Dashboard → Settings → API → Project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Found in Supabase Dashboard → Settings → API → service_role key (⚠️ Keep this secret!)

### Option B: Using Supabase Dashboard

1. Go to **Functions** in your Supabase dashboard
2. Click **Create Function**
3. Name it: `send-application-notifications`
4. Copy/paste the code from: `supabase/functions/send-application-notifications/index.ts`
5. Add environment variables in **Function Settings**:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (from Settings > API)
6. Click **Deploy**

## Step 4: Set Up Hourly Cron Job

The Edge Function now runs **hourly** instead of at a fixed midnight time. It checks which users have their notification time set for the current hour and sends notifications to them.

### Option A: Using pg_cron (Recommended for Supabase)

Run this in your Supabase SQL Editor:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the function to run every hour at the top of the hour
SELECT cron.schedule(
  'send-hourly-application-notifications',
  '0 * * * *',  -- Cron expression for every hour at :00
  $$
  SELECT
    net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-application-notifications',
      headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
    ) AS request_id;
  $$
);

-- Verify the cron job was created
SELECT * FROM cron.job WHERE jobname = 'send-hourly-application-notifications';
```

Replace:
- `YOUR_PROJECT_REF` with your Supabase project reference
- `YOUR_ANON_KEY` with your anon/public API key (from Settings > API)

### Option B: Using External Cron Service

If pg_cron is not available, use a service like:
- **Cron-job.org** (free)
- **EasyCron.com**
- **GitHub Actions**

Configure it to make a POST request to:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-application-notifications
```

With header:
```
Authorization: Bearer YOUR_ANON_KEY
```

Schedule: **Every hour** (cron: `0 * * * *`)

## Step 5: How It Works

### Flow Diagram

```
Every hour at :00
    ↓
Edge Function runs
    ↓
Get current UTC hour (e.g., 14 for 2:00 PM UTC)
    ↓
Query: Find all users with notification_time hour = 14
    ↓
For each user:
  - Check their applications
  - Filter for status changes (approved/rejected)
  - If changes found, send notification
  - Update last_notified_status
```

### Example Scenarios

**Scenario 1: User wants 8 AM notifications**
- User sets notification time to 8:00 AM in their local timezone
- App converts to UTC (e.g., 8 AM EST = 13:00 UTC)
- Saves `13:00:00` to database
- Every day at 13:00 UTC, Edge Function checks this user
- If applications have status changes, notification is sent

**Scenario 2: Multiple users at different times**
- User A: 8:00 AM (13:00 UTC)
- User B: 3:00 PM (20:00 UTC)
- User C: 8:00 AM (13:00 UTC)

At 13:00 UTC:
- Function finds Users A and C
- Checks their applications
- Sends notifications if needed

At 20:00 UTC:
- Function finds User B
- Checks applications
- Sends notification if needed

## Step 6: Test the Complete System

### Manual Testing (Bell Icon)

1. **Open the app** and login as a seeker
2. **Navigate to**: Profile → My Applications
3. **Look for the bell icon** (🔔) in the top-right
4. **Tap the bell** to check for notification updates

This will:
- Check for approved/rejected applications
- Send a local notification if updates are found
- Mark applications as notified
- Show an alert with results

### Test Automated Notifications

To test the hourly Edge Function:

1. **Set your notification time** to the next hour
   - Example: If it's 2:45 PM now, set to 3:00 PM

2. **Create a test status change**:
   - As a provider: Approve or reject one of your applications

3. **Wait for the top of the hour**
   - At 3:00 PM, the Edge Function should run

4. **Check for notification**:
   - You should receive a push notification
   - Check Edge Function logs in Supabase Dashboard

### Manual Edge Function Trigger

To test without waiting:

```bash
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-application-notifications' \
  -H 'Authorization: Bearer YOUR_ANON_KEY'
```

Expected response:
```json
{
  "success": true,
  "notificationsSent": 1,
  "applicationsUpdated": 2
}
```

## Troubleshooting

### No notifications received

1. **Check notification time is set correctly**:
   ```sql
   SELECT id, email, notification_time, push_token
   FROM profiles
   WHERE id = 'USER_ID';
   ```
   - Verify `notification_time` is not null
   - Verify `push_token` is not null

2. **Check if it's the right hour**:
   - Edge Function only processes users at their scheduled hour
   - If current UTC hour doesn't match user's notification_time hour, no notification will be sent
   - Test by setting notification_time to current hour + 1

3. **Check application status changes**:
   ```sql
   SELECT id, status, last_notified_status
   FROM applications
   WHERE seeker_id = 'USER_ID';
   ```
   - Status should be "approved" or "rejected"
   - `last_notified_status` should be different from `status` (or null)

4. **Check Edge Function logs**:
   - Go to Supabase Dashboard → Functions → send-application-notifications → Logs
   - Look for:
     - "No users scheduled for this hour" (means no users have notification_time at current hour)
     - "No status changes to notify" (means no application status changed)
     - Any error messages

### Notifications sent but not received

1. **Check push token is valid**:
   - Go to: https://expo.dev/notifications
   - Enter your push token from database
   - Send a test notification
   - If test works, the issue is with the Edge Function

2. **Check notification permissions**:
   - **iOS**: Settings → Notifications → HOU2ED → Allow Notifications
   - **Android**: Settings → Apps → HOU2ED → Notifications → Enable

### Wrong notification time

**Issue**: User selects 8:00 AM but receives notifications at a different time

**Cause**: Timezone conversion issue

**Solution**:
- The app should convert local time to UTC before saving
- Check the time conversion logic in `ProfileScreen.tsx`
- Current implementation saves the raw time - you may need to add timezone conversion

**Example fix**:
```typescript
// In handleTimeChange function, convert to UTC
const utcHours = selectedDate.getUTCHours();
const utcMinutes = selectedDate.getUTCMinutes();
const timeString = `${utcHours.toString().padStart(2, '0')}:${utcMinutes.toString().padStart(2, '0')}:00`;
```

## Monitoring

### Check notification activity

```sql
-- See which applications have been notified
SELECT
  a.id,
  a.status,
  a.last_notified_status,
  a.created_at,
  a.updated_at,
  l.title as listing_title,
  p.email as seeker_email,
  p.notification_time
FROM applications a
JOIN listings l ON a.listing_id = l.id
JOIN profiles p ON a.seeker_id = p.id
WHERE a.last_notified_status IS NOT NULL
ORDER BY a.updated_at DESC;
```

### Check users scheduled for specific hour

```sql
-- Find users who will be notified at hour 14 (2:00 PM UTC)
SELECT
  id,
  email,
  notification_time,
  push_token IS NOT NULL as has_push_token
FROM profiles
WHERE
  push_token IS NOT NULL
  AND notification_time IS NOT NULL
  AND EXTRACT(HOUR FROM notification_time) = 14;
```

### Check cron job status

```sql
-- See if cron job is running
SELECT * FROM cron.job WHERE jobname = 'send-hourly-application-notifications';

-- See cron job run history
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-hourly-application-notifications')
ORDER BY start_time DESC
LIMIT 10;
```

## Timezone Considerations

⚠️ **IMPORTANT**: All notification times are stored and processed in **UTC**.

### Current Implementation
The current implementation saves the time as selected without timezone conversion. This means:
- If a user in EST selects 8:00 AM, it saves as 08:00:00 UTC
- They will receive notifications at 8:00 AM UTC (3:00 AM EST)

### Recommended Fix
Update the time picker to convert local time to UTC:

```typescript
// In ProfileScreen.tsx - handleTimeChange function
const handleTimeChange = useCallback(
  async (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
    }

    if (selectedDate && user?.id) {
      setNotificationTime(selectedDate);

      // Convert to UTC
      const utcHours = selectedDate.getUTCHours().toString().padStart(2, "0");
      const utcMinutes = selectedDate.getUTCMinutes().toString().padStart(2, "0");
      const timeString = `${utcHours}:${utcMinutes}:00`;

      const success = await saveNotificationTime(user.id, timeString);
      if (success) {
        // Show the LOCAL time to the user
        const localHours = selectedDate.getHours();
        const localMinutes = selectedDate.getMinutes();
        Alert.alert(
          "Success",
          `Notification time updated to ${localHours}:${localMinutes.toString().padStart(2, "0")}`,
        );
      }
    }
  },
  [user?.id],
);
```

## Uninstall

To remove the notification system:

```sql
-- Remove cron job
SELECT cron.unschedule('send-hourly-application-notifications');

-- Remove database fields (optional)
ALTER TABLE profiles DROP COLUMN IF EXISTS push_token;
ALTER TABLE profiles DROP COLUMN IF EXISTS notification_time;
ALTER TABLE applications DROP COLUMN IF EXISTS last_notified_status;
```

Delete Edge Function:
```bash
supabase functions delete send-application-notifications
```

## Cost Considerations

- **Expo Push Notifications**: Free (up to 600 per hour)
- **Supabase Edge Functions**: Free tier includes 500K invocations/month
- **pg_cron**: Free (included in Supabase)

Hourly runs = 24 × 30 = 720 invocations/month = well within free tier ✅

## Support

For issues:
1. Check the troubleshooting section above
2. Review Edge Function logs in Supabase dashboard
3. Check app console logs when using the bell icon
4. Verify database fields were created correctly
5. Ensure timezone conversion is working properly
