#!/bin/bash

# ============================================================================
# Apply Signup Fix to Production Database
# ============================================================================
# This script applies the RLS policy fix to allow profile creation during signup
# ============================================================================

set -e  # Exit on error

echo "🔧 HOU2ED Signup Fix - Production Migration"
echo "==========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Error: Must run this script from project root"
    echo "   Current directory: $(pwd)"
    echo "   Expected: /Users/neilrayamajhi/h2d"
    exit 1
fi

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI not found"
    echo ""
    echo "Install it with:"
    echo "  brew install supabase/tap/supabase"
    echo ""
    exit 1
fi

echo "✅ Found Supabase CLI: $(supabase --version)"
echo ""

# Check if linked to project
if [ ! -f "supabase/.temp/project-ref" ]; then
    echo "❌ Error: Not linked to a Supabase project"
    echo ""
    echo "Link to your project with:"
    echo "  supabase link --project-ref YOUR_PROJECT_REF"
    echo ""
    exit 1
fi

PROJECT_REF=$(cat supabase/.temp/project-ref)
echo "✅ Linked to project: $PROJECT_REF"
echo ""

# Show what we're about to do
echo "📋 This will:"
echo "   1. Add missing INSERT policies to profiles table"
echo "   2. Recreate profile creation trigger with SECURITY DEFINER"
echo "   3. Grant necessary permissions"
echo "   4. Create function to fix orphaned users"
echo ""

# Confirm before proceeding
read -p "Do you want to proceed? (yes/no): " -r
echo ""
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "❌ Cancelled by user"
    exit 0
fi

echo "🚀 Applying migration..."
echo ""

# Apply the migration
if supabase db push; then
    echo ""
    echo "✅ Migration applied successfully!"
    echo ""
    echo "📝 Next steps:"
    echo ""
    echo "1. Fix orphaned users (if any exist):"
    echo "   - Go to Supabase Dashboard → SQL Editor"
    echo "   - Run: SELECT * FROM fix_orphaned_auth_users();"
    echo ""
    echo "2. Test signup:"
    echo "   - Try creating a new account in your app"
    echo "   - Should work without RLS errors"
    echo ""
    echo "3. Verify policies:"
    echo "   - Run: SELECT * FROM pg_policies WHERE tablename = 'profiles';"
    echo "   - Should see 2 INSERT policies"
    echo ""
    echo "✨ Done! Your signup flow should now work for all users."
else
    echo ""
    echo "❌ Migration failed!"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check your internet connection"
    echo "2. Verify you're linked to the correct project"
    echo "3. Check Supabase Dashboard for any errors"
    echo ""
    echo "Manual application:"
    echo "1. Go to: https://app.supabase.com/project/$PROJECT_REF/sql"
    echo "2. Open: supabase/migrations/20251127000001_fix_profile_creation_rls.sql"
    echo "3. Copy and paste the contents into SQL Editor"
    echo "4. Click 'Run'"
    echo ""
    exit 1
fi

