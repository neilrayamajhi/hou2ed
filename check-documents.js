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

async function checkDocuments() {
  console.log('🔍 CHECKING DOCUMENT RECORDS');
  console.log('='.repeat(60));

  // Check recent documents
  const checkSQL = `
    SELECT
      id,
      application_id,
      type,
      file_name,
      file_url,
      file_path,
      status,
      created_at
    FROM documents
    ORDER BY created_at DESC
    LIMIT 10;
  `;

  const result = await executeSQL(checkSQL);

  if (result && result.data) {
    console.log(`\nFound ${result.data.length} recent documents:\n`);

    result.data.forEach((doc, index) => {
      console.log(`Document ${index + 1}:`);
      console.log(`  ID: ${doc.id}`);
      console.log(`  Type: ${doc.type}`);
      console.log(`  File Name: ${doc.file_name}`);
      console.log(`  File URL: ${doc.file_url || '(null)'}`);
      console.log(`  File Path: ${doc.file_path || '(null)'}`);
      console.log(`  Status: ${doc.status}`);
      console.log(`  Created: ${new Date(doc.created_at).toLocaleString()}`);

      // Analyze storage type
      if (doc.file_path) {
        console.log(`  ✅ Uses new storage system (file_path)`);
      } else if (doc.file_url?.startsWith('http')) {
        console.log(`  ⚠️ Has HTTP URL but no storage path`);
      } else if (doc.file_url?.startsWith('file://')) {
        console.log(`  ❌ Has local file URL (needs migration)`);
      } else if (doc.file_url) {
        console.log(`  🔄 Has non-HTTP file_url - might be storage path`);
      } else {
        console.log(`  ❌ No file URL or path`);
      }
      console.log('');
    });

    // Count documents by storage type
    const countSQL = `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN file_path IS NOT NULL THEN 1 END) as with_path,
        COUNT(CASE WHEN file_url LIKE 'http%' THEN 1 END) as with_http_url,
        COUNT(CASE WHEN file_url LIKE 'file://%' THEN 1 END) as with_local_url,
        COUNT(CASE WHEN file_url IS NULL AND file_path IS NULL THEN 1 END) as no_storage
      FROM documents;
    `;

    const countResult = await executeSQL(countSQL);
    if (countResult && countResult.data && countResult.data[0]) {
      const counts = countResult.data[0];
      console.log('='.repeat(60));
      console.log('DOCUMENT STORAGE SUMMARY:');
      console.log(`  Total documents: ${counts.total}`);
      console.log(`  With storage path (new system): ${counts.with_path}`);
      console.log(`  With HTTP URL: ${counts.with_http_url}`);
      console.log(`  With local file URL: ${counts.with_local_url}`);
      console.log(`  No storage info: ${counts.no_storage}`);
    }
  } else {
    console.log('No documents found or error occurred');
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ CHECK COMPLETE');
}

checkDocuments().catch(console.error);