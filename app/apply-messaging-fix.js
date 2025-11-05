const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim().replace(/["']/g, '');
    }
  });
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4OTg4NiwiZXhwIjoyMDczOTY1ODg2fQ.J9Oc77ZR1E435SqDsngt8ey4_WVOeTE6UASlYo17Gbc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyFix() {
  console.log('🔧 Applying Messaging System Fix...\n');

  console.log('This fix needs to be applied in Supabase SQL Editor.');
  console.log('----------------------------------------\n');

  const sql = `-- Immediate fix for messaging system
-- Run this in Supabase SQL Editor

-- 1. Make application_id nullable so messages can be sent
ALTER TABLE public.messages
ALTER COLUMN application_id DROP NOT NULL;

-- 2. Add RPC function for batch read receipts (optional but recommended)
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

-- Verify the fix
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_name = 'messages'
  AND column_name = 'application_id'
  AND table_schema = 'public';`;

  console.log(sql);
  console.log('\n----------------------------------------');
  console.log('\n📝 Steps to apply:');
  console.log('1. Copy the SQL above');
  console.log('2. Go to: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/sql/new');
  console.log('3. Paste and run the SQL');
  console.log('4. The last query should show: application_id | YES');
  console.log('\nAfter applying, run: node test-messaging-complete.js');
}

applyFix();