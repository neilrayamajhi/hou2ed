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

async function fixSchema() {
  console.log('🔧 Fixing messages table schema...\n');

  const sql = `
    -- Fix messages table schema - application_id should be nullable for general messaging
    ALTER TABLE messages
    ALTER COLUMN application_id DROP NOT NULL;
  `;

  console.log('Please run this SQL in Supabase SQL Editor:');
  console.log('----------------------------------------');
  console.log(sql);
  console.log('----------------------------------------');
  console.log('\nOr go to: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/sql/new');
  console.log('\nAfter running the SQL, the messaging system should work properly!');
}

fixSchema();