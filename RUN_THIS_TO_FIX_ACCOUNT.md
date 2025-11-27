# Fix Orphaned Account - Quick Guide

## What Happened?

Your email `rayamajhineil@gmail.com` exists in Supabase's auth system but doesn't have a profile in the database. This happens when signup partially fails.

## Fix It in 3 Steps

### Step 1: Get Service Role Key

1. Open: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/settings/api
2. Find **"service_role"** key (NOT anon key)
3. Click eye icon to reveal
4. Copy the entire key

### Step 2: Run Fix Script

Open terminal in the project folder and run:

```bash
cd /Users/neilrayamajhi/h2d
SUPABASE_SERVICE_KEY=your-service-key-here node fix-neil-orphaned-account.js
```

Replace `your-service-key-here` with the key you copied.

### Step 3: Sign Up Again

1. Open the HOU2ED app
2. Try signing up with rayamajhineil@gmail.com again
3. It should work now! ✅

---

## Alternative: Manual Fix (if script doesn't work)

1. Go to: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/authentication/users
2. Search for: rayamajhineil@gmail.com
3. Click the three dots (•••) next to the user
4. Click "Delete user"
5. Confirm deletion
6. Now you can sign up fresh!

---

## What the Script Does

1. ✅ Checks if your profile exists (it doesn't)
2. 🔍 Finds the orphaned user in auth.users
3. 🗑️ Deletes it cleanly
4. ✨ Makes the email available for signup

**Safe**: Only deletes YOUR account, nothing else.

---

## Troubleshooting

**Error: "You need to set SUPABASE_SERVICE_KEY"**
- Make sure you replaced `your-service-key-here` with actual key
- The key should start with `eyJ...`

**Error: "Make sure the SERVICE_ROLE_KEY is correct"**
- You might have used the anon key by mistake
- Go back to dashboard and get the **service_role** key (not anon)

**Can't find the user in dashboard?**
- The account might have already been deleted
- Try signing up - it should work!

---

Need help? Let me know! 🙋‍♂️

