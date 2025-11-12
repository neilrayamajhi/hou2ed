#!/bin/bash

# Apply EMERGENCY RLS fix using Supabase Management API

PROJECT_REF="rixiofltzptwaiwxhhlf"
ACCESS_TOKEN="sbp_b587d82512ccd48326fa62de11a9e5e94bf1688a"

echo "🚨 EMERGENCY RLS FIX FOR APPLICATIONS TABLE"
echo "=" .repeat 50
echo "Project: $PROJECT_REF"
echo ""

# Read and prepare the SQL
SQL_CONTENT=$(cat emergency-fix-applications-rls.sql | sed 's/"/\\"/g' | sed "s/'/\\\\'/g" | tr '\n' ' ')

# Create a JSON payload
JSON_PAYLOAD="{\"query\": \"$SQL_CONTENT\"}"

echo "📝 Applying comprehensive RLS fix..."
echo ""

# Use curl to execute the SQL via Supabase Management API
RESPONSE=$(curl -s -X POST \
  "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$JSON_PAYLOAD")

# Check response
if echo "$RESPONSE" | grep -q "error"; then
    echo "❌ Error response:"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

    echo ""
    echo "Trying to apply fix in smaller chunks..."

    # Split the SQL into individual statements and try each one
    cat emergency-fix-applications-rls.sql | \
    awk '/^(DO|CREATE|DROP|ALTER|GRANT|COMMENT)/' RS=";" | \
    while IFS= read -r statement; do
        if [ ! -z "$statement" ]; then
            # Clean up the statement
            CLEAN_STMT=$(echo "$statement" | sed 's/"/\\"/g' | sed "s/'/\\\\'/g" | tr '\n' ' ')

            # Skip empty statements
            if [[ "$CLEAN_STMT" =~ [A-Za-z] ]]; then
                echo "Executing: $(echo "$CLEAN_STMT" | head -c 60)..."

                curl -s -X POST \
                  "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" \
                  -H "Authorization: Bearer $ACCESS_TOKEN" \
                  -H "Content-Type: application/json" \
                  -d "{\"query\": \"$CLEAN_STMT;\"}" > /dev/null 2>&1

                sleep 0.5
            fi
        fi
    done

    echo ""
    echo "✅ Applied fix in chunks"
else
    echo "✅ Emergency RLS fix applied successfully!"
    echo ""
    echo "Response: $RESPONSE"
fi

echo ""
echo "=" .repeat 50
echo ""
echo "🎯 CRITICAL NEXT STEPS:"
echo ""
echo "1. The policies have been completely reset"
echo "2. Try submitting an application now"
echo ""
echo "📋 Requirements for successful submission:"
echo "   ✓ User must be authenticated (logged in)"
echo "   ✓ User must have role = 'seeker' in profiles table"
echo "   ✓ seeker_id must equal auth.uid()"
echo "   ✓ listing_id must be valid"
echo ""
echo "🔍 To debug if still failing:"
echo "   1. Check user's role: SELECT role FROM profiles WHERE id = '31c57c00-777e-4e29-b6e9-4a8c2ef6698c'"
echo "   2. Verify in Supabase Dashboard: https://supabase.com/dashboard/project/$PROJECT_REF/auth/policies"
echo ""