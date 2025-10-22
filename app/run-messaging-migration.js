const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase credentials
const supabaseUrl = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Starting Messaging Tables Migration...\n');

  try {
    // Read the migration SQL
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '..', 'CREATE_MESSAGING_TABLES.sql'),
      'utf8'
    );

    console.log('📋 Migration SQL loaded successfully');
    console.log('📡 Connecting to Supabase...');

    // Since Supabase JS client doesn't support raw SQL execution directly,
    // we'll use the Management API via fetch
    const accessToken = 'sbp_35b563bea5d4526a6d8fdd91debc5ddb9d180c03';

    const response = await fetch(
      `https://api.supabase.com/v1/projects/rixiofltzptwaiwxhhlf/database/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: migrationSQL
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Migration failed:', errorText);

      // Fallback: Try to create tables one by one using Supabase client
      console.log('\n🔄 Attempting alternative approach...\n');
      await createTablesAlternative();
    } else {
      const result = await response.json();
      console.log('✅ Migration executed successfully!');
      console.log('Result:', result);
    }

    // Verify the tables were created
    await verifyTables();

  } catch (error) {
    console.error('❌ Error during migration:', error);

    // Try alternative approach
    console.log('\n🔄 Attempting alternative approach...\n');
    await createTablesAlternative();
  }
}

async function createTablesAlternative() {
  console.log('Creating tables using alternative method...\n');

  // Since we can't execute raw SQL through the JS client,
  // we'll write a Node script that uses the Supabase CLI

  const migrationCommands = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create message_threads table
CREATE TABLE IF NOT EXISTS message_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject TEXT,
  participant_ids UUID[] NOT NULL,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_urls TEXT[] DEFAULT '{}';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS thread_id UUID;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_by UUID[] DEFAULT '{}';

-- Add foreign key constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'messages_thread_id_fkey'
  ) THEN
    ALTER TABLE messages ADD CONSTRAINT messages_thread_id_fkey
      FOREIGN KEY (thread_id) REFERENCES message_threads(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_message_threads_participants ON message_threads USING GIN (participant_ids);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);

-- Enable RLS
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
CREATE POLICY "Users can view threads they participate in"
  ON message_threads FOR SELECT
  USING (auth.uid() = ANY(participant_ids));

CREATE POLICY "Users can view messages in their threads"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM message_threads
      WHERE id = messages.thread_id
      AND auth.uid() = ANY(participant_ids)
    )
  );
  `;

  // Write to temp file
  fs.writeFileSync('/tmp/messaging_migration.sql', migrationCommands);

  // Execute using Supabase CLI
  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);

  try {
    const { stdout, stderr } = await execPromise(
      'npx supabase db push --db-url "postgresql://postgres.rixiofltzptwaiwxhhlf:' +
      process.env.SUPABASE_DB_PASSWORD +
      '@aws-0-us-east-1.pooler.supabase.com:6543/postgres" < /tmp/messaging_migration.sql'
    );

    if (stdout) console.log('Output:', stdout);
    if (stderr) console.error('Errors:', stderr);
  } catch (error) {
    console.error('CLI execution failed:', error);
  }
}

async function verifyTables() {
  console.log('\n🔍 Verifying migration results...\n');

  // Check message_threads
  const { error: threadsError } = await supabase
    .from('message_threads')
    .select('*')
    .limit(0);

  if (threadsError) {
    console.log('❌ message_threads table NOT found');
    console.log('   Error:', threadsError.message);
  } else {
    console.log('✅ message_threads table exists');
  }

  // Check messages table columns
  const { data: testMessage, error: messagesError } = await supabase
    .from('messages')
    .select('id, deleted_at, thread_id, read_by, attachment_urls')
    .limit(0);

  if (messagesError) {
    console.log('⚠️ messages table check failed:', messagesError.message);
  } else {
    console.log('✅ messages table has required columns');
  }

  console.log('\n📊 Migration Summary:');
  if (!threadsError && !messagesError) {
    console.log('✅ All messaging tables are properly configured!');
    console.log('🎉 The messaging system should now work in your app.');
    console.log('\n💡 Next step: Refresh your app and try the Messages tab again.');
  } else {
    console.log('⚠️ Some issues remain. You may need to run the migration manually.');
    console.log('\n💡 To fix manually:');
    console.log('1. Go to: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/sql/new');
    console.log('2. Copy the SQL from CREATE_MESSAGING_TABLES.sql');
    console.log('3. Paste and run it in the SQL editor');
  }
}

// Run the migration
runMigration().catch(console.error);