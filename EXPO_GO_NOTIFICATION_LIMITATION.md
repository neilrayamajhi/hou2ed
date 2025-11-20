# Expo Go Notification Limitation

## The Issue

You're testing on **Expo Go** on a real phone, and daily repeating notifications don't work because:

**Expo Go does NOT support repeating calendar-based notifications** (e.g., fire every day at 5:00 PM).

### What Works in Expo Go:
- ✅ Immediate notifications
- ✅ One-time delayed notifications (`seconds: 10`)
- ✅ Simple triggers

### What DOESN'T Work in Expo Go:
- ❌ Repeating calendar triggers (`hour: 17, minute: 0, repeats: true`)
- ❌ Daily notifications at specific times
- ❌ Complex notification scheduling

## Why This Happens

Expo Go is a development client with limited native module support. Repeating calendar notifications require native notification scheduling APIs that aren't fully available in Expo Go.

## Solutions

### Option 1: Create a Development Build (RECOMMENDED)

This gives you full notification support while still being able to develop quickly.

**Steps:**

1. **Install EAS CLI** (if not already installed):
```bash
npm install -g eas-cli
```

2. **Login to Expo**:
```bash
eas login
```

3. **Configure the project** (if not already done):
```bash
eas build:configure
```

4. **Create a development build for your device**:

For iOS:
```bash
eas build --profile development --platform ios
```

For Android:
```bash
eas build --profile development --platform android
```

5. **Install the build on your device**:
- iOS: EAS will provide TestFlight link or direct download
- Android: Download and install the APK

6. **Start the dev server**:
```bash
npx expo start --dev-client
```

7. **Open the dev build** (not Expo Go) and connect to your dev server

### Option 2: Test in Production Build

Build a production version and install on your device:

```bash
# For Android
eas build --profile production --platform android

# For iOS
eas build --profile production --platform ios
```

### Option 3: Use Server-Side Push Notifications (Current Fallback)

The app already has server-side push notification support via Edge Functions. This works in Expo Go but requires:
- Setting up Expo push notification credentials
- Running the Edge Function scheduler

**Note:** This is less reliable than local scheduled notifications.

---

## Quick Test: Verify You're on Expo Go

In your app, add this to console:
```javascript
import Constants from 'expo-constants';
console.log('App variant:', Constants.expoConfig?.extra?.variant || 'expo-go');
```

If it says `expo-go`, that's your limitation.

---

## Recommendation for Production

For the production app, always use a custom development build or full production build. Don't rely on Expo Go for testing notification features.

**Benefits of Development Build:**
- ✅ Full notification support
- ✅ All native modules work
- ✅ Still get fast refresh and dev experience
- ✅ More representative of production
- ✅ Can test all features accurately

**Timeline:**
- First build: ~10-15 minutes
- Subsequent builds: Use `--local` flag for faster builds
- Development experience: Nearly identical to Expo Go

---

## Temporary Workaround for Testing

For now, you can test the notification flow by:

1. **Manual trigger**: Add a button to manually trigger the notification logic
2. **Short delays**: Use `seconds: 30` triggers instead of calendar triggers
3. **Verify scheduling works**: The test notification (10 seconds) proves permissions and basic scheduling work

But for **actual daily repeating notifications**, you need a development or production build.

