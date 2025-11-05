# 📧 Email Configuration Issues & Solutions

## Current Issues

1. **Verification emails are not being sent** when users sign up
2. **Password reset emails are not being sent**
3. The Edge Function creates users but can't trigger emails

## Root Cause

Supabase is not sending emails because:

1. **Email provider not configured** - By default, Supabase uses a basic email service with strict rate limits
2. **Rate limiting** - Free tier only allows 3 emails per hour
3. **Email confirmations disabled** in your project settings

## Solutions

### Solution 1: Enable Email in Supabase Dashboard (Quick Fix)

1. Go to: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/settings/auth
2. Scroll to "Email Settings"
3. Make sure:
   - ✅ "Enable email confirmations" is ON
   - ✅ "Enable email change confirmations" is ON
   - ✅ OTP expiry is set to 3600 (1 hour)

### Solution 2: Configure a Proper Email Provider (Production)

#### Option A: SendGrid (Recommended)

1. Create a SendGrid account: https://sendgrid.com
2. Get your API key
3. In Supabase Dashboard:
   - Go to Settings → Auth → SMTP Settings
   - Enable "Custom SMTP"
   - Enter:
     ```
     Host: smtp.sendgrid.net
     Port: 587
     Username: apikey
     Password: [Your SendGrid API Key]
     Sender email: noreply@yourdomain.com
     Sender name: HOU2ED
     ```

#### Option B: Resend (Simple)

1. Create account at: https://resend.com
2. Get API key
3. Configure in Supabase:
   ```
   Host: smtp.resend.com
   Port: 465
   Username: resend
   Password: [Your Resend API Key]
   ```

#### Option C: Gmail (For Testing Only)

1. Use Gmail SMTP:
   ```
   Host: smtp.gmail.com
   Port: 587
   Username: your-email@gmail.com
   Password: [App-specific password]
   ```
2. Note: Need to generate app password in Google Account settings

### Solution 3: Manual Email Confirmation (Current Workaround)

Since I've already confirmed your email manually, you can now:

1. **Login with your credentials:**
   - Email: neilrayamajhi2008@gmail.com
   - Password: [Your password]

2. **For other users who can't verify:**
   Run this script to manually confirm them:
   ```javascript
   node check-user-status.js
   ```

### Solution 4: Use Magic Links Instead of OTP

In your app, change from OTP to magic links:

```typescript
// Instead of OTP verification
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: 'hou2ed://auth-callback' // Deep link back to app
  }
});
```

## Testing Email Configuration

Once you configure SMTP, test it:

1. Go to: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/settings/auth
2. Click "Send test email"
3. Check if you receive it

## For Your Current Situation

✅ **Your account is now verified** - I've manually confirmed it
✅ **You can login** with your email and password
⚠️ **New users won't get emails** until you configure SMTP

## Next Steps

1. **Configure SendGrid or Resend** for production emails
2. **Update the Edge Function** to handle email sending properly
3. **Consider using magic links** instead of OTP codes for better UX

## Edge Function Update for Better Email Handling

The Edge Function should check if the user exists and is unverified, then resend verification:

```typescript
// Check if user exists but is unverified
const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(email)

if (existingUser?.user && !existingUser.user.email_confirmed_at) {
  // User exists but not verified - resend verification
  const { error } = await supabaseAdmin.auth.resend({
    type: 'signup',
    email: email,
  })

  return new Response(
    JSON.stringify({
      success: false,
      error: 'Email not verified. Verification email resent.',
      errorCode: 'EMAIL_NOT_VERIFIED',
      needsVerification: true,
    }),
    { status: 400, headers: corsHeaders }
  )
}
```