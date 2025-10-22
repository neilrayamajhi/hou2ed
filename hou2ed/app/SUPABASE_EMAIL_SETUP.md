# Supabase Email OTP Configuration Guide

## Problem
By default, Supabase sends a "magic link" email for verification, but our app expects a 6-digit OTP code.

## Solution: Configure Supabase for OTP Email Verification

### Step 1: Access Supabase Dashboard
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf)
2. Sign in with your Supabase account
3. Make sure you're in the correct project (look for `rixiofltzptwaiwxhhlf` in the URL)

### Step 2: Update the "Confirm signup" Email Template

Replace the default template with this OTP-focused template:

```html
<h2>Verify your email</h2>
<p>Hi there,</p>
<p>Thank you for signing up for HOU2ED! Please use the following code to verify your email address:</p>

<div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
  <h1 style="color: #333; letter-spacing: 5px; font-family: monospace; font-size: 32px;">
    {{ .Token }}
  </h1>
</div>

<p>This code will expire in 60 minutes.</p>
<p>If you didn't request this code, please ignore this email.</p>

<p>Best regards,<br>The HOU2ED Team</p>
```

### Step 3: Update Authentication Settings

1. In the Supabase Dashboard, go to **Authentication** → **Providers** → **Email**
2. Ensure these settings:
   - **Enable Email Signup**: ✅ Enabled
   - **Enable Email Confirmations**: ✅ Enabled
   - **Secure Email Change**: ✅ Enabled
   - **Secure Password Change**: ✅ Enabled

### Step 4: Configure OTP Settings

1. Go to **Authentication** → **Settings**
2. Under **Email OTP**:
   - **OTP Expiry**: 3600 seconds (60 minutes)
   - **Max Frequency**: 60 seconds (prevent spam)

### Step 5: Update Email Sender Settings (Optional)

For better deliverability:
1. Go to **Settings** → **Email**
2. Configure custom SMTP if available
3. Or ensure the default sender is whitelisted in spam filters

## Testing the Configuration

After updating the templates:
1. Sign up with a new email address in the app
2. Check your email for the 6-digit code
3. Enter the code in the verification modal
4. The account should be verified successfully

## Troubleshooting

If emails are not being received:
- Check spam/junk folder
- Verify email address is correct
- Check Supabase logs: **Dashboard** → **Logs** → **Auth**
- Ensure rate limits aren't exceeded

## Alternative: Development Testing

For development/testing without email configuration:
- Use Supabase Dashboard to manually confirm users
- Go to **Authentication** → **Users** → Click user → **Confirm Email**

## Important Notes

- The `{{ .Token }}` variable contains the 6-digit OTP code
- Supabase automatically generates this code when using OTP mode
- The code expires after 1 hour by default
- Users can request a new code after 60 seconds