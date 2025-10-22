# 🚀 Production Setup for HOU2ED

This guide will help you deploy your app to production so you can share it with friends.

## Step 1: Create Supabase Cloud Project

1. **Go to** https://supabase.com and sign up/login
2. **Click** "New Project"
3. **Fill in:**
   - Project name: `hou2ed-production`
   - Database Password: **SAVE THIS PASSWORD!** (e.g., `HOU2ED_Prod_2024!`)
   - Region: Choose closest to you (e.g., "US East")
   - Plan: Free tier is fine to start

4. **Wait** for project to provision (takes 2-3 minutes)

## Step 2: Get Your Project Credentials

Once your project is ready:

1. Go to **Settings → API**
2. Copy these values:
   - **Project URL**: Something like `https://abcdefgh.supabase.co`
   - **Anon Public Key**: Long string starting with `eyJ...`

## Step 3: Link Your Local Project

```bash
# Get your project reference ID from Supabase dashboard URL
# It looks like: abcdefghijklmnop

npx supabase link --project-ref YOUR_PROJECT_REF
```

When prompted, enter:
- Your Supabase access token (create one at https://app.supabase.com/account/tokens)

## Step 4: Push Database Schema to Cloud

```bash
# This pushes all your migrations to the cloud database
npx supabase db push
```

## Step 5: Create Production Environment File

Create `.env.production` in your app directory:

```env
# Production Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
EXPO_PUBLIC_APP_SCHEME=hou2ed
```

## Step 6: Configure Email Authentication

1. Go to **Authentication → Settings** in Supabase Dashboard
2. Under **Email Auth**:
   - Enable email signup ✓
   - Enable email confirmations ✓
   - Confirm email = ON

3. Go to **Authentication → Email Templates**
4. Update the **Confirmation** template:
```html
<h2>Welcome to HOU2ED!</h2>
<p>Please verify your email by clicking the link below:</p>
<p><a href="{{ .ConfirmationURL }}">Verify Email</a></p>
<p>Or enter this code in the app:</p>
<h1 style="color: #D4AF37;">{{ .Token }}</h1>
```

## Step 7: Build for Production

### Option A: Share via Expo (Easiest)

```bash
# Create an Expo account if you don't have one
npx expo register

# Login
npx expo login

# Publish to Expo
npx expo publish
```

Share the link with your friend - they just need the Expo Go app!

### Option B: Build Standalone App

```bash
# For iOS (requires Apple Developer Account - $99/year)
eas build --platform ios

# For Android (free)
eas build --platform android
```

## Step 8: Test Production Setup

1. **Switch to production environment:**
```bash
# Rename files temporarily
mv .env .env.local.backup
mv .env.production .env

# Start with production config
npx expo start --clear
```

2. **Create a test account** in your app
3. **Check Supabase Dashboard** → Authentication → Users to see the new user

## Step 9: Share with Your Friend

### If using Expo Publish:
Send them:
1. The Expo published URL
2. Tell them to install Expo Go app
3. They scan QR code or enter URL

### If using standalone build:
- **Android**: Send them the APK file
- **iOS**: Use TestFlight or App Store

## Important URLs for Management

- **Supabase Dashboard**: https://app.supabase.com/project/YOUR_PROJECT_REF
- **Database Tables**: Dashboard → Table Editor
- **User Management**: Dashboard → Authentication
- **API Logs**: Dashboard → Logs
- **Storage**: Dashboard → Storage (for images later)

## Switching Between Environments

### For Local Development:
```bash
mv .env .env.production.backup
mv .env.local.backup .env
npm run supabase:start
npx expo start
```

### For Production:
```bash
mv .env .env.local.backup
mv .env.production.backup .env
npx expo start --clear
```

## Monitoring Your App

1. **Check Users**: Dashboard → Authentication → Users
2. **Monitor Database**: Dashboard → Table Editor
3. **View Logs**: Dashboard → Logs → API Logs
4. **Check Quotas**: Dashboard → Settings → Billing

## Free Tier Limits

Supabase free tier includes:
- ✅ 500MB database
- ✅ 50,000 monthly active users
- ✅ 2GB bandwidth
- ✅ 1GB storage

More than enough for testing with friends!

## Need Your Project Details?

Once you create your Supabase project, share these with me:
1. Project Reference ID (from URL)
2. Project URL
3. Anon Key

And I'll help you set everything up!