# 🚀 How to Share HOU2ED with Your Friend

## ✅ Your App is Ready!

Your app is now connected to Supabase cloud at:
- **Dashboard**: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf
- **Database**: All tables are set up and ready

## 📱 Option 1: Share via Expo Go (EASIEST - 5 minutes)

### On Your Computer:
1. Make sure Expo is running (it should show a QR code in terminal)
2. Press `s` in the terminal to sign in to Expo (if not already)
3. Look for the QR code that appears

### Tell Your Friend to:
1. **Install Expo Go app**:
   - iPhone: Search "Expo Go" in App Store
   - Android: Search "Expo Go" in Google Play Store

2. **Scan the QR Code**:
   - iPhone: Open Camera app → Scan QR code → Tap notification
   - Android: Open Expo Go → Tap "Scan QR Code"

3. **The app will load instantly!**

## 🔄 Option 2: Publish to Expo (Share via Link)

### Publish Your App:
```bash
# First, create an Expo account if you don't have one
npx expo register

# Login to Expo
npx expo login

# Publish your app
npx expo publish
```

### Share the Link:
After publishing, you'll get a link like:
`exp://exp.host/@yourusername/hou2ed`

Your friend just:
1. Installs Expo Go
2. Opens the link on their phone
3. App loads automatically!

## 📦 Option 3: Build Standalone App

### For Android (FREE):
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure build
eas build:configure

# Build APK
eas build --platform android --profile preview
```

Wait 15-20 minutes, then download the APK and send to your friend.

### For iPhone (Requires Apple Developer Account - $99/year):
```bash
# Build for iOS
eas build --platform ios --profile preview
```

Use TestFlight to share with your friend.

## 🧪 Test Accounts

You can create test accounts directly in the app, or pre-create them:

1. Go to: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/auth/users
2. Click "Add user" → "Create new user"
3. Create accounts like:
   - **Seeker**: `testseeker@example.com` / `TestPass123!`
   - **Provider**: `testprovider@example.com` / `TestPass123!`

## 📊 Monitor Usage

Watch your app being used at:
- **Users**: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/auth/users
- **Database**: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/editor
- **Logs**: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/logs/explorer

## 🎯 Quick Test

1. Press `i` (iOS) or `a` (Android) in your terminal
2. Sign up with a test account
3. Verify it works with production Supabase
4. Check the user appears in your Supabase dashboard

## 💡 Tips for Your Friend

Tell them:
1. Install Expo Go first
2. Make sure they're on WiFi (faster loading)
3. The app might take 30 seconds to load first time
4. They can create their own account to test

## 🔄 Switching Back to Local Development

When you're done sharing:
```bash
# Switch back to local
mv .env .env.production
mv .env.local.backup .env

# Restart with local config
npx expo start --clear
```

---

**Your app is live and ready to share!** 🎉

The easiest way is Option 1 - just have them scan the QR code with Expo Go!