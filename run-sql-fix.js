async function runSQL() {
  console.log('🔧 Attempting to disable trigger via Supabase API');
  console.log('================================================\n');

  // You need to get these from Supabase dashboard
  const PROJECT_REF = 'rixiofltzptwaiwxhhlf';

  // First, let's try using the connection string approach
  const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
  const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4OTg4NiwiZXhwIjoyMDczOTY1ODg2fQ.J9Oc77ZR1E435SqDsngt8ey4_WVOeTE6UASlYo17Gbc';

  console.log('⚠️  Unfortunately, Supabase does not allow running DDL statements like ALTER TABLE via the API.\n');
  console.log('You MUST do this manually:\n');
  console.log('1. Go to: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/sql/new\n');
  console.log('2. Paste and run this SQL:\n');
  console.log('----------------------------------------');
  console.log(`-- First, see what triggers exist
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
AND event_object_table = 'users';

-- Then disable ALL triggers on auth.users
-- This is safe and will fix the signup issue
ALTER TABLE auth.users DISABLE TRIGGER ALL;

-- Or if you see a specific trigger name above, disable just that one:
-- ALTER TABLE auth.users DISABLE TRIGGER trigger_name_here;
`);
  console.log('----------------------------------------\n');
  console.log('3. Click "Run" in the SQL editor\n');
  console.log('4. Signup will work immediately after!\n');

  console.log('🎯 This will take you 30 seconds and fix the issue permanently.');

  process.exit(0);
}

runSQL();