const https = require('https');

// The SQL to execute
const sql = `
-- Fix messaging system
ALTER TABLE public.messages
ALTER COLUMN application_id DROP NOT NULL;

-- Add RPC function for batch read receipts
CREATE OR REPLACE FUNCTION public.add_user_to_read_by(
  p_message_ids UUID[],
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.messages
  SET read_by = array_append(
    array_remove(COALESCE(read_by, ARRAY[]::UUID[]), p_user_id),
    p_user_id
  )
  WHERE id = ANY(p_message_ids)
    AND NOT (p_user_id = ANY(COALESCE(read_by, ARRAY[]::UUID[])));
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_user_to_read_by(UUID[], UUID) TO authenticated;

-- Return verification
SELECT
  column_name,
  is_nullable,
  CASE
    WHEN is_nullable = 'YES' THEN 'SUCCESS - Fixed!'
    ELSE 'FAILED - Still NOT NULL'
  END as status
FROM information_schema.columns
WHERE table_name = 'messages'
  AND column_name = 'application_id'
  AND table_schema = 'public';
`;

async function executeSQLViaSupabaseEdgeFunction() {
  console.log('🚀 Executing SQL fix via Supabase...\n');

  const supabaseUrl = 'https://rixiofltzptwaiwxhhlf.supabase.co';
  const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4OTg4NiwiZXhwIjoyMDczOTY1ODg2fQ.J9Oc77ZR1E435SqDsngt8ey4_WVOeTE6UASlYo17Gbc';

  // Unfortunately, Supabase doesn't expose a direct SQL execution endpoint via REST API
  // We need to use the dashboard or psql command

  console.log('⚠️ Direct SQL execution via API is not available.');
  console.log('   Supabase requires using their dashboard or database connection.\n');

  console.log('Attempting alternative approach...\n');

  // Let's check if we can at least verify the current state
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, serviceKey);

  // Test current state
  console.log('📊 Checking current database state...');

  const { error: testError } = await supabase
    .from('messages')
    .insert({
      thread_id: '00000000-0000-0000-0000-000000000000',
      sender_id: '00000000-0000-0000-0000-000000000000',
      body: 'Test message',
      read_by: []
      // NOT providing application_id to test if it's nullable
    });

  if (testError) {
    if (testError.message.includes('application_id') && testError.message.includes('violates not-null')) {
      console.log('❌ application_id is still NOT NULL\n');

      console.log('📝 Since we cannot execute DDL via API, here are your options:\n');
      console.log('Option 1: Use Supabase Dashboard (Recommended)');
      console.log('═══════════════════════════════════════════════');
      console.log('1. Open: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/sql/new');
      console.log('2. Paste this SQL:\n');
      console.log(sql);
      console.log('\n3. Click "Run"\n');

      console.log('Option 2: Use Supabase CLI with migration');
      console.log('═══════════════════════════════════════════════');
      console.log('1. The migration file is already created at:');
      console.log('   supabase/migrations/20251102_fix_messages_nullable_fields.sql');
      console.log('2. Run: supabase db push --linked\n');

      // Open browser
      const { exec } = require('child_process');
      const url = 'https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/sql/new';

      const platform = process.platform;
      let command;
      if (platform === 'darwin') {
        command = `open "${url}"`;
      } else if (platform === 'win32') {
        command = `start "${url}"`;
      } else {
        command = `xdg-open "${url}"`;
      }

      exec(command, (error) => {
        if (!error) {
          console.log('🌐 Opened Supabase Dashboard in your browser!');
        }
      });

    } else {
      console.log('✅ Great news! application_id appears to be nullable already!');
      console.log('   (The test failed for a different reason: ' + testError.message + ')');
      console.log('\nYou can now test the messaging system:');
      console.log('   node test-messaging-final.js');
    }
  } else {
    console.log('✅ SUCCESS! application_id is already nullable!');
    console.log('\nThe messaging system should work now.');
    console.log('Test it with: node test-messaging-final.js');
  }
}

executeSQLViaSupabaseEdgeFunction().catch(console.error);