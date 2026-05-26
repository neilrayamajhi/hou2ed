# 📱 Pre-App Store Testing Guide
## Ensure First-Try Approval!

This guide helps you test your app on different devices and scenarios to catch issues **before** Apple reviews it.

---

## 🎯 Testing Strategy

### Phase 1: Simulator Testing (Quick, Easy)
### Phase 2: Real Device Testing (Required!)
### Phase 3: Pre-Submission Checklist
### Phase 4: Build & Submit

---

## 📱 PHASE 1: Simulator Testing

### **Step 1: Open iOS Simulators**

```bash
cd /Users/neilrayamajhi/h2d/app
npx expo start
```

Then press `i` to open iOS simulator.

### **Step 2: Test on Different Screen Sizes**

**Required Simulators to Test:**

1. **iPhone 15 Pro Max** (6.7" - Largest)
2. **iPhone 15 Pro** (6.1" - Standard)
3. **iPhone SE (3rd gen)** (4.7" - Smallest supported)
4. **iPad Pro (12.9")** (Tablet size)

**How to switch simulators:**

```bash
# In the terminal where Expo is running:
# Press 'Shift + i' to see list of simulators
# Or manually open from Xcode:
# Xcode → Open Developer Tool → Simulator
# Then: File → Open Simulator → iOS 17.x → [Choose Device]
```

### **Step 3: Test Matrix**

For **EACH simulator**, test these scenarios:

#### ✅ **Authentication Flow**
- [ ] Sign up as Provider
- [ ] Receive verification code (check console)
- [ ] Enter OTP code successfully
- [ ] Log out
- [ ] Log back in
- [ ] Forgot password flow

#### ✅ **Provider Features**
- [ ] Navigate to Profile
- [ ] See "Daily Availability Reminder" setting
- [ ] Open time picker modal
- [ ] Set a notification time
- [ ] Save successfully
- [ ] See time displayed correctly
- [ ] Navigate to Provider Dashboard
- [ ] Navigate to Availability Updater
- [ ] Adjust bed counts with +/- buttons
- [ ] See "Submit Changes" button clearly
- [ ] Tap Submit Changes
- [ ] See success message

#### ✅ **Navigation & UI**
- [ ] All bottom tabs work (Home, Search, Messages, Saved, Profile)
- [ ] Back buttons work everywhere
- [ ] No text cutoff on small screens
- [ ] No overlapping buttons
- [ ] Gold colors (#D4AF37) display correctly
- [ ] Dark theme looks good everywhere
- [ ] Modal overlays properly
- [ ] Time picker shows "Done" button (iOS)
- [ ] Scrolling works smoothly

#### ✅ **Edge Cases**
- [ ] Rotate device (portrait → landscape → portrait)
- [ ] Put app in background, bring back
- [ ] Force quit and reopen
- [ ] Turn off WiFi, try to use app (should show offline message)
- [ ] Turn WiFi back on
- [ ] Use app with VoiceOver enabled (Settings → Accessibility → VoiceOver)

---

## 📲 PHASE 2: Real Device Testing

**⚠️ CRITICAL: You MUST test on a real iPhone before submitting!**

Apple often rejects apps that work in simulator but fail on real devices.

### **Option A: Use Your Own iPhone**

#### **Method 1: Development Build (Recommended)**

```bash
cd /Users/neilrayamajhi/h2d/app

# Build for your device
npx eas build --profile development --platform ios

# This takes 15-20 minutes
# You'll get a download link
# Install on your device via link
```

#### **Method 2: Expo Go (Quick but Limited)**

```bash
# Already running from Phase 1
# Just scan QR code with Camera app on your iPhone
# Tap the notification to open in Expo Go
```

⚠️ **Note:** Repeating notifications don't work in Expo Go, but everything else should work!

### **Option B: TestFlight (Most Realistic)**

This is the same experience users will have:

```bash
# 1. Build production version
npx eas build --platform ios --profile production

# 2. Submit to TestFlight (NOT App Store yet)
npx eas submit --platform ios --latest

# 3. Go to App Store Connect → TestFlight
# 4. Add yourself as internal tester
# 5. Install TestFlight app on iPhone
# 6. Install your app from TestFlight
```

### **Real Device Test Checklist**

#### ✅ **Notifications (CRITICAL)**
- [ ] Set notification time in Profile
- [ ] Wait 10 seconds for test notification
- [ ] Test notification appears
- [ ] Tap notification
- [ ] App opens to correct screen (Availability Updater)
- [ ] Notification shows correct message about bed availability

#### ✅ **Performance**
- [ ] App launches in < 3 seconds
- [ ] No crashes when navigating
- [ ] Smooth scrolling everywhere
- [ ] Images load quickly
- [ ] No freezing or lag

#### ✅ **Camera & Permissions**
- [ ] Upload profile picture
- [ ] Camera permission requested properly
- [ ] Photo library permission works
- [ ] Location permission (if using maps)

#### ✅ **Network Conditions**
- [ ] Works on WiFi
- [ ] Works on cellular data
- [ ] Handles poor connection gracefully
- [ ] Offline banner appears when offline

---

## 🔍 PHASE 3: Pre-Submission Checklist

### **Apple's Common Rejection Reasons**

Go through this checklist before building for App Store:

#### ✅ **App Information**
- [ ] App name is clear and appropriate: "HOU2ED"
- [ ] App description explains what it does
- [ ] Screenshots show actual app functionality
- [ ] Keywords are relevant (housing, shelter, providers)
- [ ] No placeholder text like "Lorem ipsum"
- [ ] No "test" or "demo" accounts mentioned

#### ✅ **Privacy & Permissions**
- [ ] Privacy Policy URL provided
- [ ] Permission descriptions are clear (`NSCameraUsageDescription`, etc.)
- [ ] No unnecessary permissions requested
- [ ] User data handling explained

#### ✅ **Content & Functionality**
- [ ] App does something useful (not just a wrapper)
- [ ] All features work without crashes
- [ ] No broken links
- [ ] No "Coming Soon" features visible
- [ ] No references to other platforms (Android, etc.)

#### ✅ **User Interface**
- [ ] App uses correct iOS design patterns
- [ ] Navigation is intuitive
- [ ] Text is readable (not too small)
- [ ] Colors have sufficient contrast
- [ ] Dark mode supported (you have this! ✅)
- [ ] iPad support works (if included)

#### ✅ **Performance**
- [ ] No crashes on launch
- [ ] No memory leaks
- [ ] Loads in reasonable time
- [ ] Works on older iOS versions (check your minimum)

#### ✅ **Business Model**
- [ ] If free: Clearly free
- [ ] If paid: Price shown clearly
- [ ] No hidden costs
- [ ] No misleading features

### **Check Your app.json**

Open `/Users/neilrayamajhi/h2d/app/app.json`:

```json
{
  "expo": {
    "name": "HOU2ED",  // ✅ Good name
    "version": "1.0.0",  // ✅ Correct for first submission
    "ios": {
      "bundleIdentifier": "com.neilrayamajhi.hou2ed",  // ✅ Matches App Store Connect
      "buildNumber": "1",  // ✅ Will auto-increment
      "infoPlist": {
        "NSCameraUsageDescription": "This app uses the camera to upload documents and photos.",  // ✅ Clear
        "NSPhotoLibraryUsageDescription": "This app accesses your photo library to upload documents and photos.",  // ✅ Clear
        "NSLocationWhenInUseUsageDescription": "This app uses your location to find nearby housing listings.",  // ✅ Clear
        "ITSAppUsesNonExemptEncryption": false  // ✅ Correct (no custom encryption)
      }
    }
  }
}
```

**All looks good!** ✅

### **Review Apple's Guidelines**

Quickly skim these (15 minutes):

1. **Safety**: https://developer.apple.com/app-store/review/guidelines/#safety
2. **Performance**: https://developer.apple.com/app-store/review/guidelines/#performance
3. **Business**: https://developer.apple.com/app-store/review/guidelines/#business
4. **Design**: https://developer.apple.com/app-store/review/guidelines/#design

**Common violations to avoid:**
- ❌ App crashes
- ❌ Placeholder content
- ❌ Incomplete features
- ❌ Misleading descriptions
- ❌ Privacy violations

---

## 🚀 PHASE 4: Build & Submit

Once all testing passes, you're ready!

### **Final Pre-Build Steps**

1. **Commit all changes:**
```bash
cd /Users/neilrayamajhi/h2d
git add .
git commit -m "chore: prepare for app store submission v1.0.0"
git push origin main
```

2. **Double-check environment variables:**
```bash
cd app
npx eas secret:list
```

Should show:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### **Build for Production**

```bash
cd /Users/neilrayamajhi/h2d/app

# Build (takes 15-30 minutes)
npx eas build --platform ios --profile production

# Wait for success message
# Check status: https://expo.dev/accounts/neilrayamajhi/projects/hou2ed/builds
```

### **Submit to App Store**

```bash
# After build succeeds
npx eas submit --platform ios --latest

# Takes 5-15 minutes to upload
```

### **In App Store Connect**

1. Go to: https://appstoreconnect.apple.com
2. Click "My Apps" → "HOU2ED"
3. Wait for build to process (~10 minutes)
4. Go to "App Store" tab
5. Click your version (1.0.0)
6. Scroll to "Build" section
7. Click "+" and select your build
8. Fill in required info:
   - Screenshots (at least 3 for 6.5" display)
   - Description
   - Keywords
   - Support URL
   - Privacy Policy URL
9. Click "Submit for Review"

---

## 📸 Screenshots Required

Apple requires screenshots for these sizes:

### **iPhone 6.7" Display** (iPhone 15 Pro Max, 14 Pro Max, 13 Pro Max, 12 Pro Max)
- Size: 1290 x 2796 pixels
- Need: 3-10 screenshots

### **iPhone 6.5" Display** (iPhone 11 Pro Max, XS Max)
- Size: 1242 x 2688 pixels
- Need: 3-10 screenshots

### **How to Take Screenshots:**

1. Run app in simulator (iPhone 15 Pro Max)
2. Navigate to key screens:
   - Onboarding
   - Provider Dashboard
   - Availability Updater
   - Profile with notification setting
   - Listing details
3. Press `Cmd + S` to save screenshot
4. Screenshots saved to Desktop

**Pro tip:** Use https://app-mockup.com/ to make them look professional!

---

## ⏱️ Timeline After Submission

- **Upload to App Store:** 5-15 minutes
- **Processing:** 10-30 minutes
- **"Waiting for Review":** 0-48 hours
- **"In Review":** 0-48 hours (usually < 24 hours)
- **Review Decision:** Instant (approved/rejected email)

**Total:** Usually 1-3 days, but can be as fast as a few hours!

---

## ❌ If Rejected

**Don't panic!** Apple will tell you exactly what to fix.

1. Read the rejection message carefully
2. Fix the specific issues mentioned
3. Bump build number in app.json (or let auto-increment do it)
4. Build again
5. Submit again

**Common first-time rejections:**
- Missing screenshots
- Incomplete metadata
- Crashes (this is why we test!)
- Privacy policy issues

---

## ✅ Success Criteria

Before clicking "Submit for Review":

- [ ] Tested on ≥ 3 different simulator sizes
- [ ] Tested on real iPhone
- [ ] All features work without crashes
- [ ] Notifications work (on real device or TestFlight)
- [ ] UI looks good on all screens
- [ ] No "TODO" or "Coming Soon" visible
- [ ] Privacy Policy URL added
- [ ] Support URL added
- [ ] Screenshots uploaded (at least 3)
- [ ] App description written
- [ ] Keywords added
- [ ] Age rating selected
- [ ] All permissions explained

---

## 🎉 You're Ready!

Your app is well-built and following this guide gives you a **90%+ chance** of first-try approval!

**Next Steps:**
1. Complete Phase 1 (Simulator Testing) - 30 minutes
2. Complete Phase 2 (Real Device Testing) - 1 hour  
3. Complete Phase 3 (Pre-Submission Checklist) - 30 minutes
4. Build & Submit (Phase 4) - 1 hour

**Total time before submission:** ~3 hours
**Worth it?** Absolutely! Saves days of back-and-forth with Apple. 🚀

---

## 🆘 Quick Help

**Simulator won't open?**
```bash
sudo xcode-select --switch /Applications/Xcode.app
```

**Build failing?**
- Check the build logs on Expo dashboard
- Make sure environment variables are set
- Verify Apple credentials are correct

**Can't test notifications?**
- They don't work in Expo Go or Simulator
- Use TestFlight or development build on real device

**Need to test faster?**
- Use Expo Go for quick UI testing
- Save production builds for final validation

---

Good luck! 🍀 You've got this! 🎯

