// Check what documents are actually in storage
const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
const ACCESS_TOKEN = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!PROJECT_REF || !ACCESS_TOKEN) {
  console.error('❌ Missing environment variables!');
  process.exit(1);
}

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

async function listStorageFiles() {
  const url = `https://${PROJECT_REF}.supabase.co/storage/v1/object/list/application-documents`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'apikey': ACCESS_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prefix: '',
        limit: 100
      })
    });

    const files = await response.json();
    return files;
  } catch (error) {
    console.error('Storage list error:', error);
    return null;
  }
}

async function checkDocumentsAndStorage() {
  console.log('🔍 CHECKING DOCUMENTS AND STORAGE');
  console.log('='.repeat(60));

  // 1. Check documents table
  console.log('\n1️⃣ CHECKING DOCUMENTS TABLE...');
  const docsSQL = `
    SELECT
      d.id,
      d.application_id,
      d.type,
      d.file_path,
      d.file_url,
      d.file_name,
      d.status,
      d.created_at,
      a.seeker_id
    FROM documents d
    LEFT JOIN applications a ON d.application_id = a.id
    ORDER BY d.created_at DESC
    LIMIT 10;
  `;

  const docs = await executeSQL(docsSQL);
  if (docs && docs.length > 0) {
    console.log(`\nFound ${docs.length} recent documents:`);
    docs.forEach((doc, idx) => {
      console.log(`\n${idx + 1}. Document ID: ${doc.id}`);
      console.log(`   Application: ${doc.application_id}`);
      console.log(`   Type: ${doc.type}`);
      console.log(`   File Path: ${doc.file_path || 'NULL'}`);
      console.log(`   File URL: ${doc.file_url ? doc.file_url.substring(0, 50) + '...' : 'NULL'}`);
      console.log(`   File Name: ${doc.file_name}`);
      console.log(`   Status: ${doc.status || 'NULL'}`);
      console.log(`   Created: ${new Date(doc.created_at).toLocaleString()}`);
    });
  } else {
    console.log('No documents found in database');
  }

  // 2. Check storage bucket
  console.log('\n2️⃣ CHECKING STORAGE BUCKET...');
  const files = await listStorageFiles();

  if (files && Array.isArray(files)) {
    console.log(`\nFound ${files.length} files in storage:`);
    files.forEach((file, idx) => {
      console.log(`\n${idx + 1}. ${file.name}`);
      console.log(`   Size: ${file.metadata?.size || 'Unknown'} bytes`);
      console.log(`   Created: ${file.created_at}`);
    });
  } else if (files?.error) {
    console.log('Storage error:', files.error);
  } else {
    console.log('No files found in storage or unable to list');
  }

  // 3. Check for mismatches
  console.log('\n3️⃣ CHECKING FOR MISMATCHES...');
  if (docs && docs.length > 0) {
    const pathsInDB = docs.filter(d => d.file_path).map(d => d.file_path);
    const pathsInStorage = files && Array.isArray(files) ? files.map(f => f.name) : [];

    console.log('\nPaths in DB:', pathsInDB);
    console.log('Paths in Storage:', pathsInStorage);

    const missingInStorage = pathsInDB.filter(p => !pathsInStorage.includes(p));
    if (missingInStorage.length > 0) {
      console.log('\n⚠️ Documents in DB but missing from storage:');
      missingInStorage.forEach(path => {
        console.log(`  - ${path}`);
      });
    }
  }

  // 4. Check bucket configuration
  console.log('\n4️⃣ CHECKING BUCKET CONFIGURATION...');
  const bucketSQL = `
    SELECT
      name,
      public,
      created_at
    FROM storage.buckets
    WHERE name = 'application-documents';
  `;

  const bucket = await executeSQL(bucketSQL);
  if (bucket && bucket[0]) {
    console.log('\nBucket details:');
    console.log(`  Name: ${bucket[0].name}`);
    console.log(`  Public: ${bucket[0].public}`);
    console.log(`  Created: ${new Date(bucket[0].created_at).toLocaleString()}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ CHECK COMPLETE');
  console.log('\nRECOMMENDATIONS:');
  console.log('1. Ensure documents are uploaded with correct paths');
  console.log('2. Check RLS policies for storage bucket');
  console.log('3. Verify signed URL generation is working');
}

checkDocumentsAndStorage().catch(console.error);