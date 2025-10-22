const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

async function executeSQLInSupabase() {
  const projectRef = 'rixiofltzptwaiwxhhlf';
  const accessToken = 'sbp_35b563bea5d4526a6d8fdd91debc5ddb9d180c03';

  // Read the SQL file
  const sqlContent = fs.readFileSync(
    path.join(__dirname, '..', 'CREATE_MESSAGING_TABLES.sql'),
    'utf8'
  );

  console.log('🚀 Executing SQL migration on Supabase...\n');

  try {
    // Use Supabase Management API to run SQL
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: sqlContent
        })
      }
    );

    const responseText = await response.text();

    if (!response.ok) {
      console.error('❌ API request failed:', response.status, response.statusText);
      console.error('Response:', responseText);

      // Try breaking down the SQL into smaller chunks
      console.log('\n🔄 Attempting to run SQL in chunks...\n');
      await executeSQLInChunks(accessToken, projectRef, sqlContent);
    } else {
      try {
        const result = JSON.parse(responseText);
        console.log('✅ SQL executed successfully!');
        console.log('Result:', JSON.stringify(result, null, 2));
      } catch (e) {
        console.log('✅ SQL executed (response parsing issue but likely successful)');
        console.log('Raw response:', responseText);
      }
    }

  } catch (error) {
    console.error('❌ Error executing SQL:', error);

    // Try alternative approach
    console.log('\n🔄 Attempting alternative approach with smaller chunks...\n');
    await executeSQLInChunks(accessToken, projectRef, sqlContent);
  }
}

async function executeSQLInChunks(accessToken, projectRef, sqlContent) {
  // Split SQL into logical chunks
  const chunks = [
    // Chunk 1: Enable extension
    `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,

    // Chunk 2: Create message_threads table
    `CREATE TABLE IF NOT EXISTS message_threads (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      subject TEXT,
      participant_ids UUID[] NOT NULL,
      listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
      application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
      last_message_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );`,

    // Chunk 3: Update messages table structure
    `DO $$
    BEGIN
      -- Add deleted_at if missing
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'messages' AND column_name = 'deleted_at'
      ) THEN
        ALTER TABLE messages ADD COLUMN deleted_at TIMESTAMPTZ;
      END IF;

      -- Add edited_at if missing
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'messages' AND column_name = 'edited_at'
      ) THEN
        ALTER TABLE messages ADD COLUMN edited_at TIMESTAMPTZ;
      END IF;

      -- Add thread_id if missing
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'messages' AND column_name = 'thread_id'
      ) THEN
        ALTER TABLE messages ADD COLUMN thread_id UUID REFERENCES message_threads(id) ON DELETE CASCADE;
      END IF;

      -- Add attachment_urls if missing
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'messages' AND column_name = 'attachment_urls'
      ) THEN
        ALTER TABLE messages ADD COLUMN attachment_urls TEXT[] DEFAULT '{}';
      END IF;

      -- Add or fix read_by column
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'messages' AND column_name = 'read_by'
      ) THEN
        ALTER TABLE messages ADD COLUMN read_by UUID[] DEFAULT '{}';
      END IF;
    END $$;`,

    // Chunk 4: Create indexes
    `CREATE INDEX IF NOT EXISTS idx_message_threads_participants ON message_threads USING GIN (participant_ids);
     CREATE INDEX IF NOT EXISTS idx_message_threads_last_message ON message_threads(last_message_at DESC);
     CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
     CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
     CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);`,

    // Chunk 5: Enable RLS
    `ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
     ALTER TABLE messages ENABLE ROW LEVEL SECURITY;`,

    // Chunk 6: Create RLS policies
    `DROP POLICY IF EXISTS "Users can view threads they participate in" ON message_threads;
     CREATE POLICY "Users can view threads they participate in"
       ON message_threads FOR SELECT
       USING (auth.uid() = ANY(participant_ids));

     DROP POLICY IF EXISTS "Users can create threads they participate in" ON message_threads;
     CREATE POLICY "Users can create threads they participate in"
       ON message_threads FOR INSERT
       WITH CHECK (auth.uid() = ANY(participant_ids));`,

    // Chunk 7: Message policies
    `DROP POLICY IF EXISTS "Users can view messages in their threads" ON messages;
     CREATE POLICY "Users can view messages in their threads"
       ON messages FOR SELECT
       USING (
         EXISTS (
           SELECT 1 FROM message_threads
           WHERE id = messages.thread_id
           AND auth.uid() = ANY(participant_ids)
         )
       );

     DROP POLICY IF EXISTS "Users can send messages in their threads" ON messages;
     CREATE POLICY "Users can send messages in their threads"
       ON messages FOR INSERT
       WITH CHECK (
         sender_id = auth.uid()
         AND EXISTS (
           SELECT 1 FROM message_threads
           WHERE id = thread_id
           AND auth.uid() = ANY(participant_ids)
         )
       );`
  ];

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < chunks.length; i++) {
    console.log(`Executing chunk ${i + 1}/${chunks.length}...`);

    try {
      const response = await fetch(
        `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: chunks[i]
          })
        }
      );

      if (response.ok) {
        console.log(`  ✅ Chunk ${i + 1} executed successfully`);
        successCount++;
      } else {
        const errorText = await response.text();
        console.log(`  ❌ Chunk ${i + 1} failed:`, errorText);
        failCount++;
      }
    } catch (error) {
      console.log(`  ❌ Chunk ${i + 1} error:`, error.message);
      failCount++;
    }
  }

  console.log(`\n📊 Execution Summary: ${successCount} succeeded, ${failCount} failed`);

  if (successCount > 0) {
    console.log('\n🎯 Partial success! The core tables might have been created.');
    console.log('You should test the messaging feature in your app now.');
  }
}

// Run the migration
executeSQLInSupabase().catch(console.error);