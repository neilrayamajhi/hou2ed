# ⚠️ SECURITY ALERT: Database Scripts

## Critical Security Issue Found

The following scripts contained **HARDCODED CREDENTIALS** that gave full access to your Supabase database:
- `fix-user-role.js`
- `check-role-confusion.js`
- `check-specific-app.js`
- `check-all-tables.js`
- `check-current-apps.js`
- `apply-applications-rls-fix.js`
- `apply-rls-fix-via-api.js`

These have been renamed to `*-INSECURE-OLD.js` to prevent accidental use.

## 🔴 IMMEDIATE ACTIONS REQUIRED:

### 1. Rotate Your Supabase Service Role Key
1. Go to your Supabase dashboard
2. Navigate to Settings > API
3. Generate a new Service Role key
4. Update the key in `.env.local`

### 2. Check Git History
```bash
# Check if credentials were ever committed
git log -p --all -S 'sbp_b587d82512ccd48326fa62de11a9e5e94bf1688a'
```

If found in history, you need to:
1. Remove from history using `git filter-branch` or BFG Repo-Cleaner
2. Force push to all remotes
3. Rotate the key immediately

### 3. Use Secure Scripts Instead
A secure example has been created: `check-current-apps-secure.js`

To use it:
1. Ensure `.env.local` exists with your credentials
2. Run: `node check-current-apps-secure.js`

### 4. Never Commit Credentials
The `.gitignore` file has been updated to exclude:
- `.env`
- `.env.local`
- `*.temp.js`
- `*-with-credentials.js`

## What These Scripts Were Doing:

1. **Role Management**: Changing user roles between seeker/provider
2. **Application Checking**: Viewing and debugging application records
3. **Database Health**: Checking table counts and relationships
4. **RLS Fixes**: Applying Row Level Security policy fixes

## Safe Usage Pattern:

```javascript
// Always use environment variables
require('dotenv').config({ path: '.env.local' });

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
const ACCESS_TOKEN = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!PROJECT_REF || !ACCESS_TOKEN) {
  console.error('Missing environment variables!');
  process.exit(1);
}
```

## Remember:
- **NEVER** hardcode credentials in source files
- **ALWAYS** use environment variables
- **ROTATE** keys if they've been exposed
- **CHECK** git history for leaked credentials