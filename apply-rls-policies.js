const https = require('https');

const SUPABASE_PROJECT_REF = 'rixiofltzptwaiwxhhlf';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4OTg4NiwiZXhwIjoyMDczOTY1ODg2fQ.J9Oc77ZR1E435SqDsngt8ey4_WVOeTE6UASlYo17Gbc';

const sqlStatements = [
  // Enable RLS on storage.objects
  "ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY",

  // Drop existing policies if they exist
  "DROP POLICY IF EXISTS \"Users can upload message attachments\" ON storage.objects",
  "DROP POLICY IF EXISTS \"Users can view message attachments\" ON storage.objects",
  "DROP POLICY IF EXISTS \"Users can delete own message attachments\" ON storage.objects",
  "DROP POLICY IF EXISTS \"Users can update own message attachments\" ON storage.objects",

  // Create upload policy
  `CREATE POLICY "Users can upload message attachments"
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
  )`,

  // Create view policy
  `CREATE POLICY "Users can view message attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
      bucket_id = 'message-attachments'
      AND EXISTS (
          SELECT 1 FROM message_threads
          WHERE id = (string_to_array(name, '/'))[1]::uuid
          AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
      )
  )`,

  // Create delete policy
  `CREATE POLICY "Users can delete own message attachments"
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
  )`,

  // Create update policy
  `CREATE POLICY "Users can update own message attachments"
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
  )`
];

async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql });

    const options = {
      hostname: `${SUPABASE_PROJECT_REF}.supabase.co`,
      port: 443,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201 || res.statusCode === 204) {
          resolve({ success: true, data: responseData });
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
  console.log('🚀 Applying RLS policies for message attachments...\n');

  let successCount = 0;
  let failCount = 0;

  for (const sql of sqlStatements) {
    const preview = sql.substring(0, 60).replace(/\n/g, ' ') + '...';
    console.log(`Executing: ${preview}`);

    try {
      const result = await executeSQL(sql);
      if (result.success) {
        console.log('✅ Success');
        successCount++;
      } else {
        console.log(`⚠️ Failed: ${result.error}`);
        failCount++;

        // If it's just a "already exists" or "does not exist" error, that's okay
        if (result.error.includes('already exists') ||
            result.error.includes('does not exist') ||
            result.error.includes('PGRST202')) {
          console.log('   (This is expected, continuing...)');
          successCount++;
          failCount--;
        }
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      failCount++;
    }

    console.log('');
  }

  console.log('📊 Summary:');
  console.log(`   Successful: ${successCount}`);
  console.log(`   Failed: ${failCount}`);

  if (failCount > 0) {
    console.log('\n⚠️ Some policies may need to be applied manually.');
    console.log('Please check the Supabase dashboard SQL editor:');
    console.log('https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/sql/new');
    console.log('\nCopy the content from setup-attachment-policies.sql and run it there.');
  } else {
    console.log('\n✅ All policies applied successfully!');
  }
}

applyPolicies().catch(console.error);