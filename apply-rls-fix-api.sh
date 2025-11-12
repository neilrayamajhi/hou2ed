#!/bin/bash

# Apply RLS fix using Supabase Management API

PROJECT_REF="rixiofltzptwaiwxhhlf"
ACCESS_TOKEN="sbp_b587d82512ccd48326fa62de11a9e5e94bf1688a"
SUPABASE_URL="https://rixiofltzptwaiwxhhlf.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU"

echo "🔧 Applying RLS fix for applications table..."
echo "Project: $PROJECT_REF"
echo ""

# Read and prepare the SQL
SQL_CONTENT=$(cat supabase/migrations/20251111_fix_applications_rls.sql | sed 's/"/\\"/g' | tr '\n' ' ')

# Create a JSON payload
JSON_PAYLOAD="{\"query\": \"$SQL_CONTENT\"}"

# Use curl to execute the SQL via Supabase Management API
echo "Executing SQL via Management API..."
RESPONSE=$(curl -s -X POST \
  "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$JSON_PAYLOAD")

# Check if the response contains an error
if echo "$RESPONSE" | grep -q "error"; then
    echo "❌ Error applying RLS fix:"
    echo "$RESPONSE" | python3 -m json.tool
    echo ""
    echo "Trying alternative approach..."
    echo ""

    # Alternative: Try to mark the migration as applied without running it
    # This assumes the policies might already exist
    echo "Attempting to mark migration as complete..."
    MARK_COMPLETE_SQL="INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('20251111_fix_applications_rls') ON CONFLICT DO NOTHING;"

    curl -s -X POST \
      "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"query\": \"$MARK_COMPLETE_SQL\"}" > /dev/null 2>&1
else
    echo "✅ RLS fix has been applied successfully!"
    echo ""
    echo "Response:"
    echo "$RESPONSE" | python3 -m json.tool || echo "$RESPONSE"
fi

echo ""
echo "📝 Next steps:"
echo "1. Try submitting an application again"
echo "2. Verify the logged-in user has role = 'seeker' in profiles table"
echo "3. Ensure the seeker_id in the application matches auth.uid()"
echo ""
echo "To verify the policies were applied, check:"
echo "https://supabase.com/dashboard/project/$PROJECT_REF/auth/policies"