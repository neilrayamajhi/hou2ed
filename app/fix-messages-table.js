const fetch = require('node-fetch');

async function fixMessagesTable() {
  const projectRef = 'rixiofltzptwaiwxhhlf';
  const accessToken = 'sbp_35b563bea5d4526a6d8fdd91debc5ddb9d180c03';

  console.log('🔧 Fixing messages table structure...\n');

  // SQL to ensure messages table has all required columns
  const fixSQL = `
    -- First, check and add missing columns to messages table
    DO $$
    BEGIN
      -- Add body column if missing
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'messages' AND column_name = 'body'
      ) THEN
        ALTER TABLE messages ADD COLUMN body TEXT NOT NULL DEFAULT '';
        RAISE NOTICE 'Added body column to messages';
      END IF;

      -- Add sender_id if missing
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'messages' AND column_name = 'sender_id'
      ) THEN
        ALTER TABLE messages ADD COLUMN sender_id UUID;
        RAISE NOTICE 'Added sender_id column to messages';
      END IF;

      -- Add thread_id if missing (with foreign key)
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'messages' AND column_name = 'thread_id'
      ) THEN
        ALTER TABLE messages ADD COLUMN thread_id UUID;
        ALTER TABLE messages ADD CONSTRAINT messages_thread_id_fkey
          FOREIGN KEY (thread_id) REFERENCES message_threads(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added thread_id column to messages';
      END IF;

      -- Add created_at if missing
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'messages' AND column_name = 'created_at'
      ) THEN
        ALTER TABLE messages ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added created_at column to messages';
      END IF;

      -- Add updated_at if missing
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'messages' AND column_name = 'updated_at'
      ) THEN
        ALTER TABLE messages ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to messages';
      END IF;

      -- Add sender_id foreign key if not exists
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'messages_sender_id_fkey'
      ) THEN
        ALTER TABLE messages ADD CONSTRAINT messages_sender_id_fkey
          FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added sender_id foreign key';
      END IF;
    END $$;

    -- Return current structure
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'messages'
    ORDER BY ordinal_position;
  `;

  try {
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: fixSQL })
      }
    );

    const responseText = await response.text();

    if (!response.ok) {
      console.error('❌ Failed to fix messages table:', responseText);

      // Try individual fixes
      console.log('\n🔄 Attempting individual column fixes...\n');
      await fixColumnsIndividually(projectRef, accessToken);
    } else {
      console.log('✅ Messages table structure fixed!');
      try {
        const result = JSON.parse(responseText);
        console.log('\nCurrent messages table structure:');
        if (result && result.length > 0) {
          result.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(required)' : ''}`);
          });
        }
      } catch (e) {
        // Ignore parsing error
      }
    }

  } catch (error) {
    console.error('❌ Error fixing messages table:', error);
    await fixColumnsIndividually(projectRef, accessToken);
  }
}

async function fixColumnsIndividually(projectRef, accessToken) {
  const columns = [
    { name: 'body', sql: 'ALTER TABLE messages ADD COLUMN body TEXT NOT NULL DEFAULT \'\';' },
    { name: 'sender_id', sql: 'ALTER TABLE messages ADD COLUMN sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE;' },
    { name: 'thread_id', sql: 'ALTER TABLE messages ADD COLUMN thread_id UUID REFERENCES message_threads(id) ON DELETE CASCADE;' },
    { name: 'created_at', sql: 'ALTER TABLE messages ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();' },
    { name: 'updated_at', sql: 'ALTER TABLE messages ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();' },
    { name: 'deleted_at', sql: 'ALTER TABLE messages ADD COLUMN deleted_at TIMESTAMPTZ;' },
    { name: 'edited_at', sql: 'ALTER TABLE messages ADD COLUMN edited_at TIMESTAMPTZ;' },
    { name: 'attachment_urls', sql: 'ALTER TABLE messages ADD COLUMN attachment_urls TEXT[] DEFAULT \'{}\';' },
    { name: 'read_by', sql: 'ALTER TABLE messages ADD COLUMN read_by UUID[] DEFAULT \'{}\';' }
  ];

  for (const column of columns) {
    console.log(`Adding ${column.name}...`);

    try {
      const response = await fetch(
        `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: column.sql })
        }
      );

      if (response.ok) {
        console.log(`  ✅ ${column.name} added successfully`);
      } else {
        const error = await response.text();
        if (error.includes('already exists')) {
          console.log(`  ℹ️ ${column.name} already exists`);
        } else {
          console.log(`  ❌ Failed to add ${column.name}:`, error);
        }
      }
    } catch (error) {
      console.log(`  ❌ Error adding ${column.name}:`, error.message);
    }
  }

  console.log('\n✅ Column fixes completed!');
  console.log('The messages table should now have all required columns.');
}

// Run the fix
fixMessagesTable().catch(console.error);