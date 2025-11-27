# 🔍 Debug SendGrid Configuration

Since you already added the key to Supabase but it's still failing, let's find the issue:

---

## Step 1: Test SendGrid Key Directly

Open your terminal and run:

```bash
cd /Users/neilrayamajhi/h2d

# Read your SendGrid key from .env
cat .env | grep SENDGRID

# Test if the key works with SendGrid directly
curl --request POST \
  --url https://api.sendgrid.com/v3/mail/send \
  --header "Authorization: Bearer YOUR_KEY_HERE" \
  --header 'Content-Type: application/json' \
  --data '{
    "personalizations": [{"to": [{"email": "your-test@email.com"}]}],
    "from": {"email": "noreply@yourdomain.com"},
    "subject": "Test",
    "content": [{"type": "text/plain", "value": "Test"}]
  }'
```

Replace:
- `YOUR_KEY_HERE` with your actual SendGrid key
- `your-test@email.com` with your real email
- `noreply@yourdomain.com` with your verified sender email

**Expected results:**
- ✅ Success: Returns 202 Accepted
- ❌ 401: Key is invalid/revoked
- ❌ 403: Sender email not verified

---

## Step 2: Check SendGrid Activity Logs

**Open SendGrid Activity:**
👉 https://app.sendgrid.com/activity

**Filter by:**
- Last 1 hour
- Status: Failed (if any)

**Look for:**
- Any failed email attempts from Supabase
- Error messages explaining why it failed

---

## Step 3: Verify Sender Email Status

**Go to Sender Authentication:**
👉 https://app.sendgrid.com/settings/sender_auth

**Check:**
- ✅ Is your sender email/domain verified?
- ✅ Green checkmark next to it?

**If NOT verified:**
1. Click "Verify a Single Sender"
2. Enter the email you're using as "Sender email" in Supabase
3. Check your inbox and click verification link
4. Wait 2 minutes for propagation

---

## Step 4: Double-Check Supabase SMTP Settings

**Go to Auth Settings:**
👉 https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/auth/settings

**Scroll to SMTP Settings and verify EXACTLY:**

```
Enable Custom SMTP: ✓ (checked)

SMTP Host: smtp.sendgrid.net
SMTP Port: 587
SMTP User: apikey
SMTP Pass: SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Sender email: noreply@yourdomain.com
Sender name: HOU2ED
```

**Common mistakes:**
- ❌ Username is your email (should be "apikey")
- ❌ Port is 465 (should be 587 for TLS)
- ❌ Extra spaces before/after the key
- ❌ Copied only part of the key
- ❌ Sender email doesn't match verified email

---

## Step 5: Test Email in Supabase Dashboard

On the Auth Settings page:

**Scroll to "Email Templates"**

**Click "Send Test Email"** on the "Confirm signup" template

**What happens?**
- ✅ "Email sent successfully" → Configuration is correct!
- ❌ Error message → Read the error carefully

---

## Step 6: Check SendGrid API Key Permissions

**Go to API Keys:**
👉 https://app.sendgrid.com/settings/api_keys

**Find your key and check:**
- ✅ Status: Active (not revoked)
- ✅ Permissions: "Mail Send" → Full Access

**If it's missing or revoked:**
1. Delete the old key
2. Create a new one:
   - Name: `supabase-hou2ed`
   - Permissions: Mail Send → Full Access
3. Copy the new key
4. Update in Supabase SMTP settings
5. Update in your `.env` file

---

## Step 7: Check Supabase Auth Logs

**Open Auth Logs:**
👉 https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/logs/auth-logs

**Filter:**
- Time: Last 1 hour
- Search for: "smtp" or "email" or "error"

**Look for detailed error messages** - they often tell you exactly what's wrong:
- "535 Authentication failed" → Wrong credentials
- "550 Sender not verified" → Verify sender email
- "Connection timeout" → Wrong host/port
- "Rate limit" → Wait 20 minutes

---

## Most Common Issues:

### 1. Sender Email Not Verified (80% of cases)
**Solution:** Verify it in SendGrid at https://app.sendgrid.com/settings/sender_auth

### 2. Wrong Username
**Solution:** Must be literally `apikey`, not your email

### 3. API Key Revoked/Expired
**Solution:** Create a fresh one

### 4. Port Issue
**Solution:** Use 587 (TLS), not 465 (SSL)

### 5. Typo in Key
**Solution:** Copy-paste carefully, no spaces

---

## Quick Test Script

Create this file to test your key works:

```bash
# Save as test-sendgrid-key.sh
#!/bin/bash

echo "Testing SendGrid configuration..."
echo ""

# Read key from .env
KEY=$(grep SENDGRID .env | cut -d '=' -f2)

if [ -z "$KEY" ]; then
  echo "❌ No SENDGRID key found in .env"
  exit 1
fi

echo "Key found: ${KEY:0:10}..."
echo "Testing API access..."

# Test API access
response=$(curl -s -w "\n%{http_code}" --request POST \
  --url https://api.sendgrid.com/v3/mail/send \
  --header "Authorization: Bearer $KEY" \
  --header 'Content-Type: application/json' \
  --data '{
    "personalizations": [{"to": [{"email": "test@test.com"}]}],
    "from": {"email": "test@test.com"},
    "subject": "Test",
    "content": [{"type": "text/plain", "value": "Test"}]
  }')

http_code=$(echo "$response" | tail -n1)

echo "HTTP Response: $http_code"
echo ""

if [ "$http_code" = "202" ]; then
  echo "✅ SendGrid API key is VALID and working!"
elif [ "$http_code" = "401" ]; then
  echo "❌ SendGrid API key is INVALID or REVOKED"
  echo "   Create a new one at: https://app.sendgrid.com/settings/api_keys"
elif [ "$http_code" = "403" ]; then
  echo "❌ Sender email not verified"
  echo "   Verify at: https://app.sendgrid.com/settings/sender_auth"
else
  echo "❌ Unexpected error: $http_code"
  echo "$response"
fi
```

Run it:
```bash
chmod +x test-sendgrid-key.sh
./test-sendgrid-key.sh
```

---

## Tell Me:

1. What does "Send Test Email" in Supabase say?
2. What's in SendGrid Activity logs?
3. Is your sender email verified (green checkmark)?
4. What's the exact error in Supabase Auth Logs?

This will help me pinpoint the exact issue!

