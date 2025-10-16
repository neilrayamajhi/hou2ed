# How to Enable OTP Codes Instead of Magic Links in Supabase

## The Problem
Supabase by default sends a magic link for email confirmation, but you want a 6-digit OTP code.

## Solution: Configure Supabase Dashboard Settings

### Step 1: Auth Provider Settings
1. Go to the [Auth Settings](https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/settings/auth) page that just opened
2. Scroll to **Email Auth** section
3. Make sure these are set:
   - **Enable Email Signup**: ON
   - **Enable Email Confirmations**: ON

### Step 2: Email Template Configuration
1. Go to [Email Templates](https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/auth/templates)
2. Click on **Confirm signup**
3. Change the template type from "Magic Link" to "OTP"
4. Use this template:

```html
<h2>Verify your email</h2>

<p>Enter this verification code in the app:</p>

<div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
  <h1 style="font-family: monospace; font-size: 32px; letter-spacing: 5px;">
    {{ .Token }}
  </h1>
</div>

<p>This code expires in 1 hour.</p>
```

### Step 3: Auth Configuration
1. In the same Email Templates page
2. Look for **OTP** section
3. Ensure **OTP Length** is set to **6 digits**
4. Set **OTP Expiry** to **3600** seconds (1 hour)

### Step 4: Save Changes
Click **Save** on all modified sections.

## What the Code Does
The updated code now:
1. Creates the user account with `signUp`
2. Immediately sends an OTP code using `signInWithOtp`
3. The user receives a 6-digit code in their email
4. They enter this code in the app to verify

## Testing
1. Sign up with a new email
2. Check your email for the 6-digit code (not a link!)
3. Enter the code in the app
4. You'll be verified and logged in

## If Still Getting Links Instead of Codes
This means the email template type needs to be changed in Supabase dashboard from "Magic Link" to "OTP" mode.