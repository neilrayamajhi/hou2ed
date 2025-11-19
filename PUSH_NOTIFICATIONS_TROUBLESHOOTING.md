# Push Notifications Troubleshooting

## Error: "No projectId found"

If you see this error:
```
❌ Failed to get push notification permissions
Error: No "projectId" found
```

### For Development (Expo Go)

The code has been updated to work without a projectId in Expo Go. Just reload your app and it should work.

### For Production Builds

You need to add a project ID. Here's how:

#### Option 1: Using EAS (Recommended)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Initialize EAS in your project
cd app
eas init

# This will create a projectId and add it to app.json
```

After running `eas init`, your `app.json` will have:
```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "your-project-id-here"
      }
    }
  }
}
```

Then add to your `.env.local`:
```
EXPO_PUBLIC_PROJECT_ID=your-project-id-here
```

#### Option 2: Manual Setup

1. Go to https://expo.dev
2. Login or create an account
3. Create a new project
4. Copy the project ID

5. Add to `app/app.json`:
```json
{
  "expo": {
    "name": "HOU2ED",
    "slug": "hou2ed",
    "extra": {
      "eas": {
        "projectId": "your-project-id-here"
      }
    }
  }
}
```

6. Add to `app/.env.local`:
```
EXPO_PUBLIC_PROJECT_ID=your-project-id-here
```

#### Option 3: Development Only (No Production)

If you're only developing and testing locally with Expo Go, the updated code will work without a projectId. Just reload your app.

## Testing Push Notifications

### 1. Grant Permissions

When you first load the app after login, you should see a permission dialog:
- **iOS**: "HOU2ED Would Like to Send You Notifications"
- **Android**: Notification permission request

Tap **Allow** or **OK**.

### 2. Check Console Logs

After granting permissions, you should see:
```
✅ Got Expo push token: ExponentPushToken[xxxxxxxxxxxx]
✅ Push token saved to profile
```

If you see an error instead, check the troubleshooting steps below.

### 3. Test the Bell Icon

1. Go to **My Applications**
2. Tap the **bell icon (🔔)** in the top-right
3. You should get a notification!

## Common Issues

### "Permission denied"

**Solution**:
- Go to device Settings → Apps → HOU2ED → Notifications
- Enable all notification permissions
- Restart the app

### "No push token saved"

**Solution**:
- Check the console for errors during login
- Log out and log back in to re-initialize notifications
- Check database:
  ```sql
  SELECT id, email, push_token FROM profiles WHERE email = 'your-email@example.com';
  ```
  - If `push_token` is null, there's an issue with initialization

### Notifications not received (Android)

**Solution**:
- Check notification channel settings
- Notifications use the "default" channel
- Go to Settings → Apps → HOU2ED → Notifications → Default → Enable

### Notifications not received (iOS)

**Solution**:
- Check if Do Not Disturb is enabled
- Check notification settings in Settings → Notifications → HOU2ED
- Ensure "Allow Notifications" is ON
- Check "Banner Style" is not set to "None"

## Verify Setup

### Check Database

```sql
-- Check if push tokens are being saved
SELECT id, email, push_token FROM profiles WHERE push_token IS NOT NULL;

-- Check if notification fields exist
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'push_token';

SELECT column_name FROM information_schema.columns
WHERE table_name = 'applications' AND column_name = 'last_notified_status';
```

### Check Expo Push Token

The token should look like:
- `ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]`

If it looks different or is missing, there's an issue with Expo's push service.

### Test with Expo Push Notification Tool

1. Copy your push token from the console logs
2. Go to https://expo.dev/notifications
3. Paste your token
4. Send a test notification

If you receive the test notification, your setup is working correctly!

## Still Having Issues?

1. Check all console logs for errors
2. Verify database migrations ran successfully
3. Ensure you're logged in as a seeker (not provider)
4. Try logging out and back in
5. Check that `expo-notifications` is installed: `npm list expo-notifications`
