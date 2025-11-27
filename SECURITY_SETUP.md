# 🔐 Security Setup - Protecting Your API Keys

## 🚨 What Happened

Your SendGrid API key was exposed in your repository and **automatically revoked by SendGrid** for security. This is good - it means their security scanner is working!

---

## ✅ I've Fixed The Setup

### **1. Files Protected**
- ✅ `.gitignore` updated to block all `.env` files
- ✅ `.env.example` created as a template (safe to commit)
- ✅ Old exposed key is NOT in any files

### **2. What You Need To Do**

#### **Step 1: Create NEW SendGrid API Key** (Old one is revoked)

1. Go to: https://app.sendgrid.com/settings/api_keys

2. **Delete the old key** (it's compromised):
   - Find key ending in `...jGFes`
   - Click "Delete"

3. **Create new key**:
   - Click "Create API Key"
   - Name: `hou2ed-production-smtp`
   - Permissions: **Mail Send → Full Access**
   - Click "Create & View"
   - **Copy the key immediately** (you can't see it again!)

---

#### **Step 2: Create .env File Locally**

```bash
cd /Users/neilrayamajhi/h2d

# Copy the template
cp .env.example .env

# Edit the file (use nano, vim, or VS Code)
nano .env
```

**Put this in `.env`:**
```bash
# Supabase Configuration
SUPABASE_URL=https://rixiofltzptwaiwxhhlf.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU
SUPABASE_SERVICE_KEY=your-service-role-key-from-supabase

# SendGrid - PUT YOUR NEW KEY HERE
SENDGRID_API_KEY=SG.your-new-key-here
```

**Save and close** (Ctrl+X, then Y, then Enter)

---

#### **Step 3: Update Supabase to Use the New Key**

**Option A: Via Supabase Dashboard** (Recommended)

1. Go to: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/auth/settings

2. Scroll to **"SMTP Settings"**

3. Update:
   ```
   SMTP Host: smtp.sendgrid.net
   SMTP Port: 587
   Username: apikey
   Password: [paste your NEW SendGrid key]
   Sender Email: noreply@yourdomain.com (or your verified email)
   Sender Name: HOU2ED
   ```

4. Click **"Save"**

5. Click **"Send Test Email"** to verify it works

**Option B: Via Supabase CLI** (For local development)

The local config is in `supabase/config.toml`:

```toml
[auth.email.smtp]
enabled = true
host = "smtp.sendgrid.net"
port = 587
user = "apikey"
pass = "env(SENDGRID_API_KEY)"  # ← Reads from .env file
admin_email = "noreply@yourdomain.com"
sender_name = "HOU2ED"
```

This is already set up to use `env(SENDGRID_API_KEY)` from your `.env` file.

---

#### **Step 4: Verify .env is Protected**

```bash
# Check that .env is in .gitignore
git check-ignore .env

# Should output: .env (this means it's ignored ✓)

# If you try to add it, git should refuse:
git add .env
# Should say: ignored

# Check what's staged (make sure .env is NOT there)
git status
```

---

## 🛡️ Security Best Practices Going Forward

### **1. NEVER Commit These Files:**
- ❌ `.env`
- ❌ `.env.local`
- ❌ `.env.production`
- ❌ Any file with API keys, passwords, or secrets
- ❌ `_credentials.json` or `_secrets.json`

### **2. ALWAYS Commit These:**
- ✅ `.env.example` (template with fake values)
- ✅ `.gitignore` (to protect secrets)
- ✅ Configuration that uses `env(VARIABLE_NAME)`

### **3. What To Do If You Accidentally Commit a Secret:**

1. **Revoke the key immediately** (don't wait!)
2. **Remove from git history:**
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env" \
     --prune-empty --tag-name-filter cat -- --all
   ```
3. **Create new key** and add to `.env`
4. **Force push** (if already pushed to remote)
5. **Never use that key again**

---

## 🧪 Test That It's Working

```bash
# Test signup (should work now with new key)
cd /Users/neilrayamajhi/h2d
node test-auth-complete.js
```

Expected result:
- ✅ Signup succeeds
- ✅ Email is sent
- ✅ No "Error sending confirmation email"

---

## 📋 Checklist

Complete these in order:

- [ ] Delete old SendGrid key from SendGrid dashboard
- [ ] Create NEW SendGrid API key
- [ ] Create `.env` file locally
- [ ] Add new SendGrid key to `.env`
- [ ] Update Supabase SMTP settings with new key
- [ ] Test with "Send Test Email" button
- [ ] Verify `.env` is gitignored: `git check-ignore .env`
- [ ] Run `git status` - make sure .env is NOT listed
- [ ] Test signup: `node test-auth-complete.js`
- [ ] NEVER commit `.env` file!

---

## 🎯 For Production Deployment

When deploying to a server or Vercel/Netlify:

1. **Set environment variables** in your hosting platform:
   - Vercel: Project Settings → Environment Variables
   - Netlify: Site Settings → Environment Variables
   - Railway: Variables tab
   - Docker: Use `--env-file` flag

2. **Never hardcode keys** in code

3. **Use different keys** for development vs production

---

## 📚 Additional Resources

- [Supabase Auth SMTP Docs](https://supabase.com/docs/guides/auth/auth-smtp)
- [SendGrid API Key Security](https://docs.sendgrid.com/ui/account-and-settings/api-keys)
- [.gitignore Best Practices](https://git-scm.com/docs/gitignore)

---

## ⚠️ Important Notes

1. **The old key is dead** - it was revoked, get a new one
2. **`.env` is now protected** - git will refuse to commit it
3. **Use `.env.example`** for sharing configuration templates
4. **Each developer needs their own `.env`** file locally
5. **Production uses different keys** than development

---

**You're now set up securely!** 🔐

