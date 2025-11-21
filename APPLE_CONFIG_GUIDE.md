# 🍎 Apple Developer Account Configuration Guide

## You're Here: Step-by-Step Setup

### ✅ **Step 1: Install EAS CLI** - DONE!
```bash
npm install -g eas-cli  # ✅ Completed
eas login              # ✅ Logged in as neilrayamajhi
```

---

## 📋 **Step 2: Get Your Apple Developer Information**

### **2.1 Find Your Apple Team ID**

1. Go to: https://developer.apple.com/account
2. Log in with your Apple ID
3. Look at the top right - you'll see your Team ID (looks like: `A1B2C3D4E5`)
4. Copy this - you'll need it!

### **2.2 Create App in App Store Connect**

1. Go to: https://appstoreconnect.apple.com
2. Click **"My Apps"** → **"+"** → **"New App"**
3. Fill in:
   - **Platform**: iOS
   - **Name**: HOU2ED
   - **Primary Language**: English (U.S.)
   - **Bundle ID**: Select **"com.neilrayamajhi.hou2ed"** (or create new one)
   - **SKU**: hou2ed-app (any unique string)
   - **User Access**: Full Access

4. Click **"Create"**
5. Copy the **App Store Connect App ID** (10-digit number like: `1234567890`)

---

## 🔧 **Step 3: Update Configuration Files**

### **3.1 Update eas.json with Your Info**

```bash
cd /Users/neilrayamajhi/h2d/app
```

Open `eas.json` and update the submit section:

```json
"submit": {
  "production": {
    "ios": {
      "appleId": "YOUR_APPLE_ID_EMAIL@gmail.com",    ← Your Apple ID
      "ascAppId": "1234567890",                       ← From App Store Connect
      "appleTeamId": "A1B2C3D4E5"                     ← From developer.apple.com
    }
  }
}
```

---

## 🚀 **Step 4: Configure EAS Project**

Run this command to create your EAS project:

```bash
cd /Users/neilrayamajhi/h2d/app
eas build:configure
```

When prompted:
- **"Create EAS project?"** → Yes
- **"Generate app identifiers?"** → Yes  
- **"Link to App Store Connect?"** → Yes (if asked)

---

## 🔐 **Step 5: Set Environment Variables**

Set your Supabase credentials as secrets:

```bash
cd /Users/neilrayamajhi/h2d/app

# Set Supabase URL
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "YOUR_SUPABASE_URL"

# Set Supabase Anon Key
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "YOUR_SUPABASE_ANON_KEY"
```

**Get your Supabase credentials:**
1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
2. Copy **"Project URL"** → Use for EXPO_PUBLIC_SUPABASE_URL
3. Copy **"anon public"** key → Use for EXPO_PUBLIC_SUPABASE_ANON_KEY

---

## 📱 **Step 6: Build Your App**

### **Test Build (Internal Testing)**

```bash
eas build --platform ios --profile preview
```

This creates a build you can test on your device.

### **Production Build (App Store)**

```bash
eas build --platform ios --profile production
```

This takes 10-20 minutes. You'll get a download link when done.

---

## 📤 **Step 7: Submit to App Store**

After the build completes:

```bash
eas submit --platform ios --latest
```

This uploads your app to App Store Connect for review.

---

## ⚡ **Quick Command Reference**

```bash
# Check login status
eas whoami

# Build for testing
eas build --platform ios --profile preview

# Build for App Store
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios --latest

# Check build status
eas build:list

# View secrets
eas secret:list
```

---

## 🆘 **If You Get Errors**

### Error: "Apple ID or password incorrect"
- Make sure you're using an App-Specific Password
- Generate one at: https://appleid.apple.com/account/manage
- Use that password instead of your regular Apple ID password

### Error: "Bundle identifier is unavailable"
- The bundle ID `com.neilrayamajhi.hou2ed` might be taken
- Try: `com.neilrayamajhi.hou2ed.app` or `com.yourname.hou2ed`
- Update in `app.json` under `ios.bundleIdentifier`

### Error: "Certificate not found"
- Don't worry! EAS will automatically create certificates
- Just follow the prompts

---

## 📋 **What You Need Right Now**

1. ✅ Apple Developer Account ($99/year) - Do you have this?
2. ⏳ Apple Team ID (from developer.apple.com)
3. ⏳ App Store Connect App ID (after creating app)
4. ⏳ Supabase URL and Anon Key

---

## 🎯 **Next Steps**

**Tell me when you have:**
1. ✅ Your Apple Developer account active
2. ✅ Your Team ID from developer.apple.com
3. ✅ Your App created in App Store Connect (with App ID)

**Then I'll help you:**
1. Update eas.json with your info
2. Set up environment variables
3. Run your first build!

---

## 💡 **Pro Tips**

- Keep your App-Specific Password safe
- First build takes 20-30 mins, later builds are faster
- Use `preview` profile for testing before submitting
- You can check build progress at: https://expo.dev/accounts/neilrayamajhi/projects/hou2ed/builds

---

**Ready?** Let me know when you have your Apple Team ID and I'll help configure everything! 🚀

