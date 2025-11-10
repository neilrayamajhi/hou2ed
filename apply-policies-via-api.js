const https = require('https');

// Get the access token - you'll need to provide this
// You can get it from: https://supabase.com/dashboard/account/tokens
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF = 'rixiofltzptwaiwxhhlf';

if (!SUPABASE_ACCESS_TOKEN) {
  console.log('⚠️  SUPABASE_ACCESS_TOKEN not set!');
  console.log('\nTo get your access token:');
  console.log('1. Go to: https://supabase.com/dashboard/account/tokens');
  console.log('2. Create a new access token');
  console.log('3. Run this command with:');
  console.log('   SUPABASE_ACCESS_TOKEN="your-token-here" node apply-policies-via-api.js');
  console.log('\nAlternatively, you can apply the policies manually:');
  console.log('1. Go to: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/sql/new');
  console.log('2. Copy the content from setup-attachment-policies.sql');
  console.log('3. Run it in the SQL editor');
  process.exit(1);
}

const sqlStatements = `
-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own message attachments" ON storage.objects;

-- Create upload policy
CREATE POLICY "Users can upload message attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'message-attachments'
    AND auth.uid()::text = (string_to_array(name, '/'))[2]
    AND EXISTS (
        SELECT 1 FROM message_threads
        WHERE id = (string_to_array(name, '/'))[1]::uuid
        AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
    )
);

-- Create view policy
CREATE POLICY "Users can view message attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'message-attachments'
    AND EXISTS (
        SELECT 1 FROM message_threads
        WHERE id = (string_to_array(name, '/'))[1]::uuid
        AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
    )
);

-- Create delete policy
CREATE POLICY "Users can delete own message attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'message-attachments'
    AND auth.uid()::text = (string_to_array(name, '/'))[2]
    AND EXISTS (
        SELECT 1 FROM message_threads
        WHERE id = (string_to_array(name, '/'))[1]::uuid
        AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
    )
);

-- Create update policy
CREATE POLICY "Users can update own message attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'message-attachments'
    AND auth.uid()::text = (string_to_array(name, '/'))[2]
    AND EXISTS (
        SELECT 1 FROM message_threads
        WHERE id = (string_to_array(name, '/'))[1]::uuid
        AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
    )
);
`;

async function runSQL(sql) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql });

    const options = {
      hostname: 'api.supabase.com',
      port: 443,
      path: `/v1/projects/${PROJECT_REF}/database/query`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve({ success: true, data: JSON.parse(responseData) });
        } else {
          resolve({ success: false, error: `HTTP ${res.statusCode}: ${responseData}` });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function applyPolicies() {
  console.log('🚀 Applying RLS policies via Supabase Management API...\n');

  try {
    console.log('Executing SQL statements...');
    const result = await runSQL(sqlStatements);

    if (result.success) {
      console.log('✅ All policies applied successfully!');
      console.log('\nResult:', result.data);
    } else {
      console.log('⚠️ Failed to apply policies:', result.error);
      console.log('\nPlease apply the policies manually:');
      console.log('1. Go to: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/sql/new');
      console.log('2. Copy the content from setup-attachment-policies.sql');
      console.log('3. Run it in the SQL editor');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nPlease apply the policies manually:');
    console.log('1. Go to: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/sql/new');
    console.log('2. Copy the content from setup-attachment-policies.sql');
    console.log('3. Run it in the SQL editor');
  }
}

applyPolicies();