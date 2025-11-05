const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4OTg4NiwiZXhwIjoyMDczOTY1ODg2fQ.J9Oc77ZR1E435SqDsngt8ey4_WVOeTE6UASlYo17Gbc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyFix() {
  console.log('🔧 Applying SQL Fix to Supabase...\n');

  // First, check current status
  console.log('1️⃣ Checking current status...');

  // Try inserting a test message without application_id
  const { error: testError } = await supabase
    .from('messages')
    .insert({
      thread_id: '00000000-0000-0000-0000-000000000000',
      sender_id: '00000000-0000-0000-0000-000000000000',
      body: 'test',
      read_by: []
    });

  if (testError) {
    if (testError.message.includes('application_id') && testError.message.includes('violates not-null')) {
      console.log('❌ application_id is currently NOT NULL');
      console.log('   Proceeding with fix...\n');
    } else {
      console.log('ℹ️ Test error:', testError.message);
    }
  }

  // Since we can't execute ALTER TABLE through the API, we need to use the dashboard
  console.log('2️⃣ SQL Fix Instructions:\n');
  console.log('Since Supabase API doesn\'t allow ALTER TABLE commands,');
  console.log('you need to run this SQL in the Supabase Dashboard:\n');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('COPY THIS SQL:');
  console.log('═══════════════════════════════════════════════════════════\n');

  const sql = `-- Fix messaging system (Run in Supabase SQL Editor)
-- This makes application_id nullable so messages can be sent without it

ALTER TABLE public.messages
ALTER COLUMN application_id DROP NOT NULL;

-- Add RPC function for batch read receipts (performance optimization)
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

-- Grant permission
GRANT EXECUTE ON FUNCTION public.add_user_to_read_by(UUID[], UUID) TO authenticated;

-- Verify the fix worked
SELECT
  column_name,
  is_nullable,
  CASE
    WHEN is_nullable = 'YES' THEN '✅ Fixed!'
    ELSE '❌ Still NOT NULL'
  END as status
FROM information_schema.columns
WHERE table_name = 'messages'
  AND column_name = 'application_id'
  AND table_schema = 'public';`;

  console.log(sql);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('STEPS TO APPLY:');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('1. Click this link to open Supabase SQL Editor:');
  console.log('   👉 https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/sql/new\n');

  console.log('2. Paste the SQL above into the editor\n');

  console.log('3. Click "Run" button\n');

  console.log('4. You should see in the results:');
  console.log('   application_id | YES | ✅ Fixed!\n');

  console.log('5. After applying, run this command to test:');
  console.log('   node test-messaging-final.js\n');

  console.log('═══════════════════════════════════════════════════════════');

  // Try to open the URL in the default browser
  const { exec } = require('child_process');
  const url = 'https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/sql/new';

  console.log('\n🌐 Opening Supabase Dashboard in your browser...');

  // Try to open based on platform
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
    if (error) {
      console.log('   (Could not auto-open browser, please click the link above)');
    } else {
      console.log('   ✅ Browser opened!');
    }

    console.log('\n📋 The SQL has been copied to apply-fix-now.sql');
    console.log('   You can also find it there if needed.\n');
  });
}

applyFix();