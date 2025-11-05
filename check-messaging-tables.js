const { createClient } = require('@supabase/supabase-js');

// Read .env file manually since we might not have dotenv
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
const envPath = path.join(__dirname, 'app', '.env');
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
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMessagingTables() {
  console.log('🔍 Checking messaging tables in database...\n');

  try {
    // Check if message_threads table exists
    const { data: threadsTable, error: threadsError } = await supabase
      .from('message_threads')
      .select('id')
      .limit(1);

    if (threadsError) {
      if (threadsError.message.includes('relation') && threadsError.message.includes('does not exist')) {
        console.log('❌ Table "message_threads" does not exist');
      } else {
        console.log('⚠️ Error checking message_threads:', threadsError.message);
      }
    } else {
      console.log('✅ Table "message_threads" exists');
    }

    // Check if messages table exists
    const { data: messagesTable, error: messagesError } = await supabase
      .from('messages')
      .select('id')
      .limit(1);

    if (messagesError) {
      if (messagesError.message.includes('relation') && messagesError.message.includes('does not exist')) {
        console.log('❌ Table "messages" does not exist');
      } else {
        console.log('⚠️ Error checking messages:', messagesError.message);
      }
    } else {
      console.log('✅ Table "messages" exists');
    }

    // Check if legacy threads table exists
    const { data: legacyTable, error: legacyError } = await supabase
      .from('threads')
      .select('id')
      .limit(1);

    if (legacyError) {
      if (legacyError.message.includes('relation') && legacyError.message.includes('does not exist')) {
        console.log('✅ Legacy "threads" table does not exist (good)');
      } else {
        console.log('⚠️ Error checking threads:', legacyError.message);
      }
    } else {
      console.log('⚠️ Legacy "threads" table exists - may cause conflicts');
    }

    // Check table structure
    console.log('\n📊 Checking table structures...\n');

    // Get column info using raw SQL
    const { data: columnsData, error: columnsError } = await supabase.rpc('get_table_columns', {
      table_names: ['message_threads', 'messages']
    }).single();

    if (columnsError) {
      // Try alternative approach
      console.log('Using alternative method to check columns...');

      // Check message_threads columns
      const { data: sampleThread } = await supabase
        .from('message_threads')
        .select('*')
        .limit(1);

      if (sampleThread && sampleThread.length > 0) {
        console.log('message_threads columns:', Object.keys(sampleThread[0]));
      }

      // Check messages columns
      const { data: sampleMessage } = await supabase
        .from('messages')
        .select('*')
        .limit(1);

      if (sampleMessage && sampleMessage.length > 0) {
        console.log('messages columns:', Object.keys(sampleMessage[0]));
      }
    }

    // Check RLS policies
    console.log('\n🔒 Checking RLS policies...\n');

    // Test if RLS is enabled
    const { data: rlsTest, error: rlsError } = await supabase
      .from('message_threads')
      .select('id')
      .limit(1);

    if (rlsError && rlsError.message.includes('row-level security')) {
      console.log('✅ RLS is enabled on message_threads');
    } else {
      console.log('⚠️ RLS might not be properly configured');
    }

    // Check realtime subscriptions
    console.log('\n📡 Checking realtime configuration...\n');

    const channel = supabase.channel('test-channel');
    const subscription = channel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages'
      }, (payload) => {
        console.log('Realtime test received:', payload);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime subscription successful');
          channel.unsubscribe();
        } else {
          console.log('⚠️ Realtime subscription status:', status);
        }
      });

    // Give it a moment to connect
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n✨ Database check complete!\n');

  } catch (error) {
    console.error('Error checking database:', error);
  }

  process.exit(0);
}

// Add RPC function if it doesn't exist
async function createRPCFunction() {
  const functionSQL = `
    CREATE OR REPLACE FUNCTION get_table_columns(table_names text[])
    RETURNS TABLE(table_name text, column_name text, data_type text)
    LANGUAGE sql
    STABLE
    AS $$
      SELECT
        c.table_name::text,
        c.column_name::text,
        c.data_type::text
      FROM information_schema.columns c
      WHERE c.table_name = ANY(table_names)
        AND c.table_schema = 'public'
      ORDER BY c.table_name, c.ordinal_position;
    $$;
  `;

  try {
    await supabase.rpc('exec_sql', { sql: functionSQL });
  } catch (err) {
    // Function might already exist or exec_sql might not be available
  }
}

checkMessagingTables();