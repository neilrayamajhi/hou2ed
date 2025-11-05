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

async function checkSchema() {
  console.log('🔍 Checking messages table schema...\n');

  // Get a sample message to see structure
  const { data: sample, error } = await supabase
    .from('messages')
    .select('*')
    .limit(1);

  if (error && !error.message.includes('0 rows')) {
    console.log('Error:', error);
  }

  if (sample && sample.length > 0) {
    console.log('Sample message columns:');
    console.log(Object.keys(sample[0]));
    console.log('\nSample data:', sample[0]);
  } else {
    console.log('No messages in table, trying to get schema info...');

    // Try to insert a test message to see what's required
    const { error: insertError } = await supabase
      .from('messages')
      .insert({
        thread_id: '00000000-0000-0000-0000-000000000000',
        sender_id: '00000000-0000-0000-0000-000000000000',
        body: 'test'
      });

    if (insertError) {
      console.log('\nInsert error reveals schema requirements:');
      console.log(insertError.message);
      console.log('\nThis tells us which columns are required!');
    }
  }
}

checkSchema();