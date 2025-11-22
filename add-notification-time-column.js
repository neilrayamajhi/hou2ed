const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './app/.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addNotificationTimeColumn() {
  console.log('🔧 Adding notification_time column to profiles table...\n');

  try {
    // Check if column already exists
    const { data: columns, error: checkError } = await supabase
      .from('profiles')
      .select('notification_time')
      .limit(1);

    if (!checkError) {
      console.log('✅ notification_time column already exists!');
      console.log('   Column is ready to use.');
      return;
    }

    // Column doesn't exist, need to add it via SQL
    console.log('📝 Column does not exist yet.');
    console.log('\n⚠️  To add the column, you need to run this SQL in Supabase Dashboard:');
    console.log('   (Dashboard → SQL Editor → New Query)\n');
    console.log('----------------------------------------');
    console.log('ALTER TABLE profiles');
    console.log('ADD COLUMN IF NOT EXISTS notification_time TIME DEFAULT NULL;');
    console.log('');
    console.log('COMMENT ON COLUMN profiles.notification_time IS');
    console.log("  'Time of day when user wants to receive daily notifications (HH:MM:SS format)';");
    console.log('----------------------------------------\n');
    console.log('📋 After running the SQL:');
    console.log('   1. Go to https://supabase.com/dashboard');
    console.log('   2. Select your project');
    console.log('   3. Click "SQL Editor" in the left sidebar');
    console.log('   4. Click "New Query"');
    console.log('   5. Paste the SQL above');
    console.log('   6. Click "Run"');
    console.log('\n   Then the notification time will persist! ✅');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

addNotificationTimeColumn();

