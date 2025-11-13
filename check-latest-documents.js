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

async function checkLatestDocuments() {
  console.log('🔍 CHECKING LATEST DOCUMENTS');
  console.log('='.repeat(60));

  // Get the most recent documents
  const sql = `
    SELECT
      d.*,
      a.created_at as application_created
    FROM documents d
    JOIN applications a ON d.application_id = a.id
    ORDER BY d.created_at DESC
    LIMIT 5;
  `;

  const result = await executeSQL(sql);

  if (result && result.length > 0) {
    console.log(`\nFound ${result.length} recent documents:\n`);

    result.forEach((doc, index) => {
      console.log(`Document ${index + 1}:`);
      console.log(`  ID: ${doc.id}`);
      console.log(`  Type: ${doc.type}`);
      console.log(`  File Name: ${doc.file_name}`);
      console.log(`  File URL: ${doc.file_url || '(null)'}`);
      console.log(`  File Path: ${doc.file_path || '(null)'}`);
      console.log(`  Status: ${doc.status}`);
      console.log(`  Created: ${new Date(doc.created_at).toLocaleString()}`);
      console.log(`  App Created: ${new Date(doc.application_created).toLocaleString()}`);

      // Analyze the document
      if (doc.file_path && !doc.file_path.includes('temp_')) {
        console.log(`  ✅ Has valid storage path`);
      } else if (doc.file_path && doc.file_path.includes('temp_')) {
        console.log(`  ❌ Has temp path (not in storage)`);
      } else if (!doc.file_path && !doc.file_url) {
        console.log(`  ❌ No storage information`);
      } else if (doc.file_url && !doc.file_path) {
        console.log(`  ⚠️ Has URL but no path`);
      }

      console.log('-'.repeat(40));
    });
  } else {
    console.log('No documents found or error occurred');
    console.log('Result:', JSON.stringify(result, null, 2));
  }

  // Check storage bucket for actual files
  console.log('\n' + '='.repeat(60));
  console.log('CHECKING STORAGE BUCKET:');

  // List files in storage bucket
  const storageSQL = `
    SELECT
      name,
      created_at,
      updated_at,
      metadata
    FROM storage.objects
    WHERE bucket_id = 'application-documents'
    ORDER BY created_at DESC
    LIMIT 10;
  `;

  const storageResult = await executeSQL(storageSQL);

  if (storageResult && storageResult.length > 0) {
    console.log(`\nFound ${storageResult.length} files in storage:`);
    storageResult.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file.name} (Created: ${new Date(file.created_at).toLocaleString()})`);
    });
  } else {
    console.log('No files found in storage bucket or bucket does not exist');
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ CHECK COMPLETE');
}

checkLatestDocuments().catch(console.error);