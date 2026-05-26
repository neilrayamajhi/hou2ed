# Push Notification Setup Guide

This guide explains how to set up the daily midnight push notifications for application status changes.

## Overview

The notification system sends daily push notifications at 12:00 AM to users whose applications have been **approved** or **rejected** since the last notification.

## Features

- ✅ Automatic daily notifications at midnight
- ✅ Only notifies on status changes (approved/rejected)
- ✅ Summary format: "You have 2 updates: 1 approved, 1 rejected"
- ✅ Manual test button in "My Applications" screen
- ✅ Tracks notification history to avoid duplicates

## Prerequisites

1. **Expo Project ID**
   - Get it from `app.json` or Expo dashboard
   - Add to `.env.local`: `EXPO_PUBLIC_PROJECT_ID=your-project-id`

2. **Supabase CLI**
   - Install: `npm install -g supabase`
   - Login: `supabase login`

## Step 1: Run Database Migration

Run this SQL in your Supabase SQL Editor:

```sql
-- Add push notification fields
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS push_token TEXT;

ALTER TABLE applications
ADD COLUMN IF NOT EXISTS last_notified_status TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_push_token ON profiles(push_token);
CREATE INDEX IF NOT EXISTS idx_applications_last_notified
ON applications(seeker_id, status, last_notified_status);
```

**Or** use the provided SQL file:
```bash
# In Supabase SQL Editor, paste contents of:
ADD_NOTIFICATION_FIELDS.sql
```

## Step 2: Deploy Supabase Edge Function

### Option A: Using Supabase CLI (Recommended)

```bash
# Navigate to project root
cd path/to/hou2ed

# Deploy the function
supabase functions deploy send-application-notifications --project-ref YOUR_PROJECT_REF

# Set up secrets (required for the function to work)
supabase secrets set SUPABASE_URL=your-supabase-url --project-ref YOUR_PROJECT_REF
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key --project-ref YOUR_PROJECT_REF
```

### Option B: Using Supabase Dashboard

1. Go to **Functions** in your Supabase dashboard
2. Click **Create Function**
3. Name it: `send-application-notifications`
4. Copy/paste the code from: `supabase/functions/send-application-notifications/index.ts`
5. Add environment variables in **Function Settings**:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (from Settings > API)

## Step 3: Set Up Cron Job (Midnight Schedule)

### Option A: Using pg_cron (Recommended for Supabase)

Run this in your Supabase SQL Editor:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the function to run at midnight (00:00) every day
SELECT cron.schedule(
  'send-daily-application-notifications',
  '0 0 * * *',  -- Cron expression for midnight
  $$
  SELECT
    net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-application-notifications',
      headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
    ) AS request_id;
  $$
);

-- Verify the cron job was created
SELECT * FROM cron.job;
```

Replace:
- `YOUR_PROJECT_REF` with your Supabase project reference
- `YOUR_ANON_KEY` with your anon/public API key

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

Schedule: Daily at 12:00 AM (cron: `0 0 * * *`)

## Step 4: Test the Setup

### Manual Test Button

1. **Open the app** and login as a seeker
2. **Navigate to**: Profile → My Applications
3. **Look for the bell icon** (🔔) in the top-right
4. **Tap the bell** to check for notification updates

This will:
- Check for approved/rejected applications
- Send a local notification if updates are found
- Mark applications as notified
- Show an alert with results

### Test Notification Flow

1. **As a provider**: Update an application status to "approved" or "rejected"
2. **As a seeker**: Tap the bell icon in "My Applications"
3. **Expected result**:
   - Alert: "Notification Sent! 1 update found: 1 approved"
   - Notification appears in notification tray
   - Tapping notification opens the app to Applications List

### Test Midnight Cron Job

```bash
# Manually trigger the Edge Function to test
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-application-notifications' \
  -H 'Authorization: Bearer YOUR_ANON_KEY'
```

Expected response:
```json
{
  "success": true,
  "notificationsSent": 2,
  "applicationsUpdated": 2
}
```

## Troubleshooting

### No notifications received

1. **Check push token is saved**:
   ```sql
   SELECT id, email, push_token FROM profiles WHERE id = 'USER_ID';
   ```
   - If `push_token` is null, restart the app to re-register

2. **Check application status**:
   ```sql
   SELECT id, status, last_notified_status FROM applications WHERE seeker_id = 'USER_ID';
   ```
   - Status should be "approved" or "rejected"
   - `last_notified_status` should be different from `status` (or null)

3. **Check Edge Function logs**:
   - Go to Supabase Dashboard → Functions → send-application-notifications → Logs
   - Look for errors or "No status changes to notify"

4. **Check Expo push permissions**:
   - When app first loads, you should see permission request
   - Go to device Settings → App → Notifications → Enable

### Notifications sent but not received

1. **Test with Expo Push Notification Tool**:
   - Go to: https://expo.dev/notifications
   - Enter your push token
   - Send a test notification

2. **Check notification channel (Android)**:
   - Notifications are sent on the "default" channel
   - Check device notification settings for the app

### Duplicate notifications

- This shouldn't happen because we track `last_notified_status`
- If it does, check that the Edge Function is updating the field correctly

## Monitoring

### Check notification history

```sql
-- See which applications have been notified
SELECT
  a.id,
  a.status,
  a.last_notified_status,
  a.created_at,
  l.title as listing_title,
  p.email as seeker_email
FROM applications a
JOIN listings l ON a.listing_id = l.id
JOIN profiles p ON a.seeker_id = p.id
WHERE a.last_notified_status IS NOT NULL
ORDER BY a.updated_at DESC;
```

### Check cron job status

```sql
-- See if cron job is running
SELECT * FROM cron.job WHERE jobname = 'send-daily-application-notifications';

-- See cron job run history
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-daily-application-notifications')
ORDER BY start_time DESC
LIMIT 10;
```

## Uninstall

To remove the notification system:

```sql
-- Remove cron job
SELECT cron.unschedule('send-daily-application-notifications');

-- Remove database fields (optional)
ALTER TABLE profiles DROP COLUMN IF EXISTS push_token;
ALTER TABLE applications DROP COLUMN IF EXISTS last_notified_status;
```

Delete Edge Function:
```bash
supabase functions delete send-application-notifications --project-ref YOUR_PROJECT_REF
```

## Cost Considerations

- **Expo Push Notifications**: Free (up to 600 per hour)
- **Supabase Edge Functions**: Free tier includes 500K invocations/month
- **pg_cron**: Free (included in Supabase)

Daily midnight run = 30 invocations/month = well within free tier ✅

## Support

For issues:
1. Check the troubleshooting section above
2. Review Edge Function logs in Supabase dashboard
3. Check app console logs when tapping the bell icon
4. Verify database fields were created correctly
