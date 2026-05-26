# App Store Build & Submission Guide

This guide walks you through building your app and submitting it to the Apple App Store using Expo's EAS (Expo Application Services).

---

## 📚 What You're About To Do

1. **Build** - Create a production iOS app file (.ipa) on Expo's servers
2. **Submit** - Upload that file to Apple's App Store Connect
3. **Review** - Apple will review your app (takes 1-3 days typically)

---

## 🔧 Prerequisites Checklist

Before you start, make sure you have:

- [ ] All code changes committed and pushed to git ✅ (We just did this!)
- [ ] An Apple Developer Account (paid, $99/year)
- [ ] Your app created in App Store Connect
- [ ] Environment variables set in your Expo account

---

## 🚀 Step-by-Step Instructions

### **Step 1: Navigate to your app directory**

```bash
cd /Users/neilrayamajhi/h2d/app
```

**What this does:** Changes your terminal to the app folder where your `app.json` and `eas.json` files are.

---

### **Step 2: Make sure you're logged into Expo**

```bash
npx eas login
```

**What this does:** Logs you into your Expo account. If you're already logged in, it will just confirm that.

**What you'll see:** It will ask for your email/username and password if you're not logged in.

---

### **Step 3: Build your iOS app for production**

```bash
npx eas build --platform ios --profile production
```

**What this does:** 
- Sends your code to Expo's servers
- Compiles a production iOS app (.ipa file)
- The build happens in the cloud, so you don't need a Mac or Xcode!

**What you'll see:**
1. It will ask if you want to create a new build - type `Y` and press Enter
2. It will upload your code
3. You'll get a link to watch the build progress on expo.dev
4. The build takes **15-30 minutes** typically

**Important:** The `--profile production` uses the settings from your `eas.json` file:
- `autoIncrement: true` - Automatically increases the build number
- It will use your environment variables for Supabase

---

### **Step 4: Check your environment variables (IMPORTANT!)**

While the build is running, make sure your secrets are set up:

1. Go to: https://expo.dev/accounts/neilrayamajhi/projects/hou2ed/secrets
2. Make sure these secrets exist:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`

**To get your Supabase credentials:**

1. Go to your Supabase project: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf
2. Click on "Project Settings" (gear icon in the left sidebar)
3. Click on "API" in the settings menu
4. Copy the following values:
   - **Project URL** (starts with `https://rixiofltzptwaiwxhhlf.supabase.co`)
   - **anon public key** (the long string under "Project API keys")

**If the secrets don't exist in Expo, add them:**

```bash
# Add Supabase URL
npx eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://rixiofltzptwaiwxhhlf.supabase.co" --type string

# Add Supabase Anon Key (replace with your actual key)
npx eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-anon-key-from-supabase" --type string
```

---

### **Step 5: Wait for the build to complete**

**How to check build status:**

Option A: Click the link shown in your terminal
Option B: Go to https://expo.dev/accounts/neilrayamajhi/projects/hou2ed/builds

**Build statuses:**
- 🔵 **In Queue** - Waiting for a build server
- 🟡 **In Progress** - Currently building
- 🟢 **Finished** - Build succeeded! ✅
- 🔴 **Failed** - Something went wrong (check the logs)

**If the build fails:** Click on the failed build to see the error logs. Common issues:
- Missing credentials
- Environment variable problems
- Code compilation errors

---

### **Step 6: Submit to App Store Connect**

Once your build is **Finished**, run:

```bash
npx eas submit --platform ios --latest
```

**What this does:**
- Takes your most recent successful build
- Uploads it to App Store Connect automatically
- Uses the credentials from your `eas.json`:
  - Apple ID: yourschedule@icloud.com
  - App Store Connect App ID: 6755585207
  - Team ID: SVZ9ABX4SM

**What you'll see:**
1. It will find your latest build
2. Ask you to confirm - type `Y` and press Enter
3. Upload progress
4. Success message with a link to App Store Connect

**This takes:** 5-15 minutes typically

---

### **Step 7: Go to App Store Connect**

1. Visit: https://appstoreconnect.apple.com
2. Click on "My Apps"
3. Click on "HOU2ED"
4. Go to the "TestFlight" tab

**You should see:** Your new build processing. It will say "Processing" for 5-10 minutes.

**What's happening:** Apple is:
- Scanning for malware
- Checking technical compliance
- Processing your app for distribution

---

### **Step 8: Add for App Review**

Once processing is complete:

1. Click the "App Store" tab (not TestFlight)
2. In the left sidebar under "iOS App", you might see:
   - "1.0 Prepare for Submission" or
   - "1.0 Ready for Sale" (if already submitted)
3. Click on the version number
4. Scroll down to "Build" section
5. Click the **+** button next to "Build"
6. Select your newly uploaded build
7. Fill in any required information:
   - App Store screenshots
   - Description
   - Keywords
   - Support URL
   - Privacy Policy URL
   - Age rating
8. Click "Save"
9. Click "Submit for Review"

---

## 📱 Version Management

Your `app.json` currently shows:

```json
"version": "1.0.0"
```

### When to update version numbers:

- **1.0.0 → 1.0.1** - Bug fixes, small changes (what you just did!)
- **1.0.0 → 1.1.0** - New features added
- **1.0.0 → 2.0.0** - Major changes, breaking changes

The **build number** auto-increments on each build (you have `autoIncrement: true`).

### To update version for next release:

1. Edit `/Users/neilrayamajhi/h2d/app/app.json`
2. Change `"version": "1.0.0"` to `"version": "1.0.1"`
3. Commit the change
4. Build again

---

## 🔄 Quick Commands Summary

```bash
# Navigate to app directory
cd /Users/neilrayamajhi/h2d/app

# Login to Expo
npx eas login

# Build for iOS production
npx eas build --platform ios --profile production

# Submit to App Store
npx eas submit --platform ios --latest

# Check build status
npx eas build:list

# View secrets
npx eas secret:list
```

---

## 🐛 Common Issues & Solutions

### Issue: "Build failed with error: Missing credentials"
**Solution:** Run `npx eas credentials` to set up your Apple credentials

### Issue: "Missing EXPO_PUBLIC_SUPABASE_URL"
**Solution:** Add your environment variables (see Step 4)

### Issue: "Unable to authenticate with Apple"
**Solution:** 
1. Make sure you're logged into the correct Apple ID
2. Check that your Apple Developer membership is active
3. Verify 2FA is enabled on your Apple ID

### Issue: "Build is taking forever"
**Solution:** Expo builds can take 20-40 minutes during peak times. Be patient!

### Issue: "Submit failed - Invalid credentials"
**Solution:** Double-check your `eas.json` has the correct:
- `appleId` (your Apple ID email)
- `ascAppId` (your App Store Connect app ID)
- `appleTeamId` (your Apple Developer Team ID)

---

## 📊 Monitoring Your Build

### View all builds:
https://expo.dev/accounts/neilrayamajhi/projects/hou2ed/builds

### View submissions:
https://expo.dev/accounts/neilrayamajhi/projects/hou2ed/submissions

### Build logs:
Click on any build to see detailed logs of what happened

---

## ⏱️ Timeline Expectations

- **Build time:** 15-30 minutes
- **Submission upload:** 5-15 minutes
- **Apple processing:** 5-10 minutes
- **App Review:** 1-3 days (can be as fast as a few hours!)

**Total time from starting build to submitting for review:** ~1 hour
**Total time until app is live:** 1-3 days (depends on Apple)

---

## ✅ Success Checklist

After following this guide, you should have:

- [ ] Code committed and pushed to GitHub
- [ ] Production build created on Expo
- [ ] Build successfully finished (green checkmark)
- [ ] App submitted to App Store Connect
- [ ] Build selected in App Store Connect
- [ ] App submitted for review

---

## 🎯 Next Steps After Submission

1. **Monitor your email** - Apple will email you at `yourschedule@icloud.com`
2. **Check App Store Connect** - Review status updates appear there
3. **Respond to Apple** - If they reject, they'll tell you what to fix
4. **Plan your launch** - Once approved, you choose when to release

---

## 💡 Pro Tips

1. **Test before building** - Always test your app thoroughly before creating a production build
2. **Use TestFlight** - Before submitting to App Store, test via TestFlight with real users
3. **Read rejection reasons carefully** - Apple is usually specific about what needs fixing
4. **Keep builds organized** - Add build messages to track what changed: `npx eas build --platform ios --profile production --message "Fixed profile screen"`
5. **Monitor Expo status** - https://status.expo.dev - Check if there are any service issues

---

## 🆘 Need Help?

- **Expo Documentation:** https://docs.expo.dev/build/introduction/
- **EAS Build Docs:** https://docs.expo.dev/build/setup/
- **EAS Submit Docs:** https://docs.expo.dev/submit/introduction/
- **Expo Discord:** https://chat.expo.dev/
- **App Store Connect Help:** https://developer.apple.com/support/app-store-connect/

---

## 📝 Notes for Future Builds

Every time you want to release an update:

1. Make your code changes
2. Test thoroughly
3. Commit and push to git
4. Run `npx eas build --platform ios --profile production`
5. Wait for build to complete
6. Run `npx eas submit --platform ios --latest`
7. Go to App Store Connect and select the new build
8. Submit for review

The whole process gets faster each time you do it! 🚀

