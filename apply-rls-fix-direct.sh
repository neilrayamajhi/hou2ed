#!/bin/bash

# Apply RLS fix directly to Supabase cloud database

PROJECT_REF="rixiofltzptwaiwxhhlf"
ACCESS_TOKEN="sbp_b587d82512ccd48326fa62de11a9e5e94bf1688a"

echo "🔧 Applying RLS fix for applications table..."
echo "Project: $PROJECT_REF"
echo ""

# Read the SQL file
SQL_CONTENT=$(cat supabase/migrations/20251111_fix_applications_rls.sql)

# Use Supabase CLI to execute SQL directly
echo "$SQL_CONTENT" | SUPABASE_ACCESS_TOKEN=$ACCESS_TOKEN npx supabase db execute --linked

echo ""
echo "✅ RLS fix has been applied!"
echo ""
echo "Next steps:"
echo "1. Try submitting an application again"
echo "2. Make sure the logged-in user has role = 'seeker' in profiles table"
echo "3. The seeker_id in the application should match auth.uid()"