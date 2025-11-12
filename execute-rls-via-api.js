// Direct API approach to fix RLS policies
async function executeRLSFix() {
  console.log('🔧 Applying RLS fix via Supabase Dashboard...\n');

  console.log('================================');
  console.log('MANUAL FIX INSTRUCTIONS');
  console.log('================================\n');

  console.log('Go to: https://supabase.com/dashboard/project/hqxxaxlwfkznwndvgqya/sql/new\n');

  console.log('Copy and paste this SQL:\n');

  const sql = `
-- Fix RLS policies for applications table
-- This resolves the "row violates row-level security policy" error

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Seekers can create applications" ON applications;
DROP POLICY IF EXISTS "Seekers can view own applications" ON applications;

-- Create simplified, working policies
CREATE POLICY "seekers_create_applications_fixed"
ON applications FOR INSERT
TO authenticated
WITH CHECK (
    seeker_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'seeker'
    )
);

CREATE POLICY "users_view_own_applications"
ON applications FOR SELECT
TO authenticated
USING (seeker_id = auth.uid());

-- Grant permissions
GRANT ALL ON applications TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
`;

  console.log(sql);
  console.log('\nClick "RUN" to execute the SQL');
  console.log('\nDashboard URL: https://supabase.com/dashboard/project/hqxxaxlwfkznwndvgqya/sql/new');
}

executeRLSFix();
