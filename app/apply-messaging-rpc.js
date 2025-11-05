const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
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
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyRPCFunction() {
  console.log('🔧 Applying Messaging RPC Function...\n');

  const sql = `
    -- Add RPC function for batch updating read receipts
    -- This optimizes the N+1 query issue when marking multiple messages as read

    CREATE OR REPLACE FUNCTION add_user_to_read_by(
      p_message_ids UUID[],
      p_user_id UUID
    )
    RETURNS VOID AS $$
    BEGIN
      UPDATE messages
      SET read_by = array_append(
        array_remove(read_by, p_user_id),
        p_user_id
      )
      WHERE id = ANY(p_message_ids)
        AND NOT (p_user_id = ANY(read_by));
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Grant execute permission to authenticated users
    GRANT EXECUTE ON FUNCTION add_user_to_read_by(UUID[], UUID) TO authenticated;

    -- Add comment for documentation
    COMMENT ON FUNCTION add_user_to_read_by(UUID[], UUID) IS
    'Batch update function to mark multiple messages as read by a user. Prevents duplicates in read_by array.';
  `;

  try {
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      // Try alternative approach - the RPC might not exist
      console.log('exec_sql RPC not available, function may already exist or need manual application');
      console.log('\nPlease run this SQL in Supabase SQL Editor:');
      console.log('----------------------------------------');
      console.log(sql);
      console.log('----------------------------------------');
    } else {
      console.log('✅ RPC function applied successfully!');
    }

    // Test if the function exists
    console.log('\n🧪 Testing if function exists...');

    // Try to call the function with empty arrays (won't do anything but will verify it exists)
    const { error: testError } = await supabase.rpc('add_user_to_read_by', {
      p_message_ids: [],
      p_user_id: '00000000-0000-0000-0000-000000000000'
    });

    if (testError) {
      if (testError.message.includes('function') && testError.message.includes('does not exist')) {
        console.log('❌ Function does not exist yet. Please apply manually in Supabase SQL Editor.');
      } else if (testError.code === 'PGRST202') {
        console.log('❌ Function not found. Please apply manually in Supabase SQL Editor.');
      } else {
        console.log('⚠️ Function may exist but returned error:', testError.message);
      }
    } else {
      console.log('✅ Function exists and is callable!');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

applyRPCFunction();