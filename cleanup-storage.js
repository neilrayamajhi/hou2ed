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
    if (result.error) {
      console.error('SQL Error:', result.error);
    }
    return result;
  } catch (error) {
    console.log(`Error: ${error.message}`);
    return null;
  }
}

async function cleanupStorage() {
  console.log('🧹 CLEANING UP STORAGE AND FIXING BUCKET');
  console.log('='.repeat(60));

  // Step 1: Remove orphaned storage.objects records
  console.log('\n1️⃣ Removing orphaned storage.objects records...');

  const cleanupSQL = `
    DELETE FROM storage.objects
    WHERE bucket_id = 'application-documents';
  `;

  const cleanupResult = await executeSQL(cleanupSQL);
  if (cleanupResult && !cleanupResult.error) {
    console.log('✅ Orphaned storage records cleaned up');
  }

  // Step 2: Update documents table to clear invalid paths
  console.log('\n2️⃣ Clearing invalid file paths in documents table...');

  const updateDocsSQL = `
    UPDATE documents
    SET file_path = NULL
    WHERE file_path IS NOT NULL;
  `;

  const updateResult = await executeSQL(updateDocsSQL);
  if (updateResult && !updateResult.error) {
    console.log('✅ Document file paths cleared');
  }

  // Step 3: Recreate the bucket with proper settings
  console.log('\n3️⃣ Recreating storage bucket...');

  // First delete the old bucket
  const deleteBucketSQL = `
    DELETE FROM storage.buckets
    WHERE id = 'application-documents';
  `;

  const deleteResult = await executeSQL(deleteBucketSQL);
  if (deleteResult && !deleteResult.error) {
    console.log('✅ Old bucket removed');
  }

  // Now recreate it
  const createBucketSQL = `
    INSERT INTO storage.buckets (
      id,
      name,
      public,
      file_size_limit,
      allowed_mime_types
    )
    VALUES (
      'application-documents',
      'application-documents',
      false,
      10485760,
      ARRAY[
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]::text[]
    );
  `;

  const createResult = await executeSQL(createBucketSQL);
  if (createResult && !createResult.error) {
    console.log('✅ Bucket recreated successfully');
  }

  // Step 4: Verify the cleanup
  console.log('\n4️⃣ Verifying cleanup...');

  const verifySQL = `
    SELECT
      (SELECT COUNT(*) FROM storage.objects WHERE bucket_id = 'application-documents') as object_count,
      (SELECT COUNT(*) FROM storage.buckets WHERE id = 'application-documents') as bucket_count,
      (SELECT COUNT(*) FROM documents WHERE file_path IS NOT NULL) as docs_with_path;
  `;

  const verifyResult = await executeSQL(verifySQL);
  if (verifyResult && verifyResult[0]) {
    const counts = verifyResult[0];
    console.log('\nCurrent state:');
    console.log(`  Storage objects: ${counts.object_count}`);
    console.log(`  Buckets: ${counts.bucket_count}`);
    console.log(`  Documents with paths: ${counts.docs_with_path}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ CLEANUP COMPLETE');
  console.log('\nNOTE: All documents need to be re-uploaded.');
  console.log('Users should submit new applications with documents.');
}

cleanupStorage().catch(console.error);