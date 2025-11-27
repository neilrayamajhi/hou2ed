# 🔧 Fix SendGrid SMTP - It Was Working Before

## ✅ Confirmed: My code changes did NOT break it

I tested with your original code and it still gives the same error. Something changed with SendGrid.

---

## 🎯 Most Likely Issues (SendGrid Specific)

### **1. API Key Expired or Revoked** ⭐ (Most Common)
SendGrid API keys can expire or be revoked.

**Fix:**
1. Go to: https://app.sendgrid.com/settings/api_keys
2. Create a **NEW** API key:
   - Name: "Supabase HOU2ED"
   - Permissions: "Mail Send" (Full Access)
3. Copy the key immediately (you can't see it again!)
4. Update in Supabase:
   - Go to: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/auth/settings
   - SMTP Password: Paste new API key
   - Save

---

### **2. Sender Email/Domain Not Verified Anymore**
SendGrid requires sender verification. If domain DNS changed or verification expired:

**Check:**
1. Go to: https://app.sendgrid.com/settings/sender_auth
2. Check status of your:
   - Domain Authentication (preferred for production)
   - OR Single Sender Verification

**If not verified:**
- Domain: Add DNS records they provide
- Single Sender: Click verification email

---

### **3. Account Suspended or Downgraded**
SendGrid free tier has limits. If you hit limits or payment issue:

**Check:**
1. Go to: https://app.sendgrid.com/
2. Check for any alerts/warnings
3. Check billing status

---

### **4. IP Whitelist / Security Settings**
SendGrid might have blocked Supabase's IPs.

**Check:**
1. Go to: https://app.sendgrid.com/settings/access
2. Make sure Supabase IPs aren't blocked
3. Check IP Access Management

---

## ⚡ FASTEST FIX: Create Fresh API Key

**1. Go to SendGrid:**
https://app.sendgrid.com/settings/api_keys

**2. Click "Create API Key"**
- Name: `supabase-hou2ed-prod`
- Type: **Full Access** (or at least Mail Send)

**3. Copy the key (looks like: `SG.xxxxxxxxxxx`)**

**4. Update Supabase SMTP:**
https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/auth/settings

```
SMTP Host: smtp.sendgrid.net
SMTP Port: 587
Username: apikey
Password: [paste your NEW SendGrid API key]
Sender Email: [your verified email]
```

**5. Click "Save"**

**6. Test immediately:**
Click "Send Test Email" button on the same page

---

## 🔍 Check SendGrid Activity

**See if emails are being received:**
https://app.sendgrid.com/activity

**Look for:**
- Recent email attempts
- Any errors or bounces
- Delivery status

---

## 📧 Verify Your Sender Email/Domain

**If using a domain (recommended):**
1. Go to: https://app.sendgrid.com/settings/sender_auth/domain/create
2. Add your domain
3. Add DNS records to your domain registrar:
   - CNAME records for authentication
   - SPF record
   - DKIM record
4. Wait for verification (can take up to 48 hours)

**If using single email (quick test):**
1. Go to: https://app.sendgrid.com/settings/sender_auth/senders/new
2. Add email address
3. Check email and click verification link

---

## 🧪 Test SendGrid Directly

Test if SendGrid itself works (not through Supabase):

```bash
# Install curl if needed
curl --request POST \
  --url https://api.sendgrid.com/v3/mail/send \
  --header 'Authorization: Bearer YOUR_SENDGRID_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "personalizations": [{"to": [{"email": "your-test@email.com"}]}],
    "from": {"email": "noreply@yourdomain.com"},
    "subject": "Test from SendGrid",
    "content": [{"type": "text/plain", "value": "This is a test"}]
  }'
```

**If this fails:** Problem is with SendGrid account
**If this works:** Problem is with Supabase configuration

---

## 🎯 APPLY DATABASE FIX ANYWAY

While fixing SendGrid, apply the database fix so profiles are created correctly:

**Go to:** https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/sql

**Run:** `fix-auth-production.sql`

This ensures when SendGrid works, everything else works too.

---

## ⚠️ Common SendGrid Issues

### "Error sending confirmation email" = One of these:
1. ❌ API key invalid/expired → Create new one
2. ❌ Sender not verified → Verify in SendGrid dashboard
3. ❌ Account suspended → Check billing/limits
4. ❌ Wrong credentials → Double-check username is "apikey"

### Check SendGrid Logs:
https://app.sendgrid.com/activity

Filter by:
- Last 24 hours
- Status: Failed
- Reason: Will show exact error

---

## 📞 Quick Checklist

Do these in order:

1. [ ] Create NEW SendGrid API key
2. [ ] Update Supabase SMTP with new key
3. [ ] Verify sender email/domain in SendGrid
4. [ ] Click "Send Test Email" in Supabase
5. [ ] Check SendGrid Activity for errors
6. [ ] If still failing, check SendGrid account status
7. [ ] Apply database fix SQL

---

## 💡 Alternative: Switch to Resend (5 min)

If SendGrid is giving you trouble, Resend is easier:

1. Sign up: https://resend.com
2. Verify your domain (add 3 DNS records)
3. Get API key
4. In Supabase SMTP settings:
   ```
   Host: smtp.resend.com
   Port: 465
   Username: resend
   Password: re_xxxxxxxxxxxx
   ```

Resend is more reliable and easier to configure.

---

**Bottom line:** Create a fresh SendGrid API key and update it in Supabase. That fixes 90% of SendGrid issues!

