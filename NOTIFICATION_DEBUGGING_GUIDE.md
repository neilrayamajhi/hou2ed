# Notification Debugging Guide

## Issue
Provider notifications only fire when SETTING the time, not when the scheduled daily reminder actually goes off.

## What I Added to Help Debug

### 1. Test Notification (10 seconds)
When you set a notification time, the app now schedules TWO notifications:
- **Daily repeating notification** - fires at your chosen time every day
- **TEST notification** - fires 10 seconds after you set the time (development only)

This helps verify that scheduled notifications work on your device.

### 2. Enhanced Logging
Added detailed console logs to see:
- When notifications are scheduled
- When notifications actually fire
- What data they contain
- Exact timestamp

## Testing Steps

### Step 1: Test Immediate Scheduling (10 second test)

1. **Open the app as provider**
2. **Go to Profile**
3. **See the big gold banner**
4. **Tap "CHANGE"** and set any time
5. **Wait 10 seconds**
6. **Expected**: You should get a test notification:
   ```
   🧪 Test Notification
   Your daily availability reminder will work like this!
   ```

**If you GET the test notification:**
- ✅ Your device supports scheduled notifications
- ✅ Permissions are correct
- ✅ The scheduling system works

**If you DON'T get the test notification:**
- ❌ There's a device/permission issue
- Check: Settings → HOU2ED → Notifications → Make sure "Allow Notifications" is ON

### Step 2: Check Console Logs

Open the console and look for these messages:

```
📅 Scheduling daily notification for 17:00
   First trigger: [date/time]
   User role: provider
✅ Daily notification scheduled successfully! ID: [some-id]
   Will notify provider every day at 17:00
🧪 Test notification scheduled for 10 seconds from now (ID: [some-id])
```

Then after 10 seconds:
```
📨 Notification received while in foreground: {...}
   Title: 🧪 Test Notification
   Body: Your daily availability reminder will work like this!
   Time: [current time]
🏠 Provider availability reminder shown (app in foreground)
   ✅ Notification should be visible now!
```

### Step 3: Test Actual Daily Reminder

1. **Set the reminder time to 1-2 minutes from now**
   - Example: If it's 3:45 PM, set it to 3:47 PM
2. **Keep the app open (in foreground)**
3. **Wait until that time**
4. **Expected**: You should see console logs:
   ```
   📨 Notification received while in foreground: {...}
      Title: Update Your Listings 🏠
      Body: Time to update your bed availability!
      Time: 3:47:xx PM
   🏠 Provider availability reminder shown (app in foreground)
      ✅ Notification should be visible now!
   ```
5. **You should also see a notification banner**

### Step 4: Test with App in Background

1. **Set reminder time to 1-2 minutes from now**
2. **Close the app (swipe away) or put it in background**
3. **Wait until that time**
4. **Expected**: Notification should appear on lock screen/notification center
5. **Tap the notification**
6. **Expected**: App opens and navigates to AvailabilityUpdater

## Common Issues and Solutions

### Issue 1: No Test Notification After 10 Seconds

**Cause:** Notification permissions not granted

**Fix:**
1. Go to device Settings
2. Find HOU2ED app
3. Go to Notifications
4. Enable "Allow Notifications"
5. Try again

### Issue 2: Test Notification Works, But Daily Reminder Doesn't

**Cause:** The time might have already passed when you set it

**Fix:**
- The system automatically schedules for tomorrow if the time already passed
- Check console log: `⏭️ Time 17:00 already passed today, scheduling for tomorrow`
- Either wait until tomorrow OR set a time that's 1-2 minutes in the future

### Issue 3: Notification Shows in Console But Not on Screen

**Cause:** Notification handler might not be configured properly or platform-specific issue

**Check:**
1. Verify notification handler in `notification.service.ts`:
   ```typescript
   Notifications.setNotificationHandler({
     handleNotification: async () => ({
       shouldShowAlert: true,    // ✅ Must be true
       shouldPlaySound: true,     // ✅ Must be true
       shouldSetBadge: true,      // ✅ Must be true
     }),
   });
   ```

2. Check if running on:
   - **iOS Simulator**: Notifications don't work in simulator! Use real device.
   - **Android Emulator**: Should work, but check notification settings in emulator
   - **Real Device**: Should work with permissions granted

### Issue 4: Notification Works in Foreground, Not Background

**Cause:** Platform-specific notification delivery

**iOS:**
- Notifications in foreground: Controlled by `setNotificationHandler` ✅
- Notifications in background: Handled by iOS automatically ✅
- Make sure "Allow Notifications" is enabled in device Settings

**Android:**
- Notifications in foreground: Controlled by `setNotificationHandler` ✅
- Notifications in background: Handled by Android automatically ✅
- Make sure notification channel is set up (it is - line 60-66 in notification.service.ts)

## Verification Checklist

Use this checklist to verify everything is working:

- [ ] Notification permissions granted (check device Settings)
- [ ] Test notification fires after 10 seconds ✅
- [ ] Console logs show scheduled notification details ✅
- [ ] Daily reminder fires when app is in foreground ✅
- [ ] Daily reminder fires when app is in background ✅
- [ ] Notification banner appears on screen ✅
- [ ] Tapping notification navigates to AvailabilityUpdater ✅
- [ ] Notification repeats every day at the same time ✅

## What to Tell Me

If it's still not working, tell me:

1. **Which step fails?**
   - Does the 10-second test notification work?
   - Do you see the console logs?
   - Does it work in foreground but not background?

2. **What device/platform?**
   - iOS or Android?
   - Real device or simulator/emulator?
   - Device model and OS version?

3. **What do the console logs say?**
   - Copy/paste the logs around the time you set the notification
   - Copy/paste the logs when the notification should have fired

4. **Are notification permissions granted?**
   - Check Settings → HOU2ED → Notifications

## Technical Details

### How It Works

1. **Scheduling (when you set time):**
   ```typescript
   scheduleDailyNotification(hour, minute, userId, userRole)
     → Notifications.scheduleNotificationAsync({
         trigger: { hour, minute, repeats: true }
       })
   ```

2. **Firing (at scheduled time):**
   - Expo Notifications handles the trigger
   - Notification appears in system notification center
   - App receives event via `addNotificationReceivedListener` (foreground)
   - OR notification appears directly (background)

3. **Tapping (when user taps notification):**
   - `addNotificationResponseReceivedListener` fires
   - Extracts `data.type` and `data.userRole`
   - Navigates based on type (AvailabilityUpdater for providers)

### Platform-Specific Behavior

**iOS:**
- Notifications require "Allow Notifications" permission
- Simulator does NOT show notifications (use real device)
- Background notifications handled by iOS
- Sound/badge require explicit permission

**Android:**
- Notifications require runtime permission (requested automatically)
- Emulator supports notifications
- Uses notification channels (we create "default" channel)
- Background notifications handled by Android

---

## Quick Test Command

If you want to manually check scheduled notifications:

1. Set a reminder time
2. Open React Native Debugger / Metro console
3. Look for: `📋 Found X scheduled notifications:`
4. Should show at least 2:
   - One for daily reminder (repeats: true)
   - One for test (10 seconds)

If you see scheduled notifications in console but they don't fire, that's a platform/permission issue, not a code issue.

