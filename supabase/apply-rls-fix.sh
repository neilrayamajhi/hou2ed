#!/bin/bash

echo "🔧 Applying RLS policy fix for username login..."
echo ""

# Read the SQL content
SQL=$(cat << 'EOSQL'
-- Drop the policy if it already exists (idempotent)
DROP POLICY IF EXISTS "Allow username to email lookup for login" ON public.profiles;

-- Create the policy
CREATE POLICY "Allow username to email lookup for login"
    ON public.profiles
    FOR SELECT
    TO anon
    USING (true);

-- Add comment
COMMENT ON POLICY "Allow username to email lookup for login" ON public.profiles IS
  'Allows unauthenticated users to resolve usernames to emails during login.';
EOSQL
)

echo "SQL to be executed:"
echo "═══════════════════════════════════════════════════════════════════"
echo "$SQL"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "📝 To apply this fix, run the SQL above in your Supabase Dashboard:"
echo ""
echo "1. Go to https://supabase.com/dashboard"
echo "2. Select your project"
echo "3. Go to SQL Editor"
echo "4. Paste the SQL above"
echo "5. Click 'Run'"
echo ""
echo "Or save the SQL to a file and apply via CLI if you have direct database access."
echo ""
