const fetch = require('node-fetch');

const PROJECT_REF = 'rixiofltzptwaiwxhhlf';
const ACCESS_TOKEN = 'sbp_b587d82512ccd48326fa62de11a9e5e94bf1688a';

async function executeSQL(sql) {
  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.log(`Error: ${error.message}`);
    return null;
  }
}

async function verifyStorageFiles() {
  console.log('🔍 VERIFYING STORAGE FILES');
  console.log('='.repeat(60));

  // Check if the storage.objects table shows files
  const sql = `
    SELECT
      id,
      bucket_id,
      name,
      created_at,
      updated_at
    FROM storage.objects
    WHERE bucket_id = 'application-documents'
    ORDER BY created_at DESC;
  `;

  const result = await executeSQL(sql);

  if (result && result.length > 0) {
    console.log(`\nStorage.objects table shows ${result.length} files:\n`);
    result.forEach((file, index) => {
      console.log(`${index + 1}. ${file.name}`);
      console.log(`   ID: ${file.id}`);
      console.log(`   Bucket: ${file.bucket_id}`);
      console.log(`   Created: ${new Date(file.created_at).toLocaleString()}`);
      console.log('-'.repeat(40));
    });
  } else {
    console.log('No files found in storage.objects table');
    console.log('Result:', JSON.stringify(result, null, 2));
  }

  // Check if bucket exists
  console.log('\n' + '='.repeat(60));
  console.log('CHECKING BUCKET:');

  const bucketSQL = `
    SELECT
      id,
      name,
      public,
      created_at
    FROM storage.buckets
    WHERE id = 'application-documents';
  `;

  const bucketResult = await executeSQL(bucketSQL);

  if (bucketResult && bucketResult.length > 0) {
    const bucket = bucketResult[0];
    console.log('Bucket found:');
    console.log(`  ID: ${bucket.id}`);
    console.log(`  Name: ${bucket.name}`);
    console.log(`  Public: ${bucket.public}`);
    console.log(`  Created: ${new Date(bucket.created_at).toLocaleString()}`);
  } else {
    console.log('❌ Bucket not found!');
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ VERIFICATION COMPLETE');
}

verifyStorageFiles().catch(console.error);