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

async function updateDocumentsTable() {
  console.log('🔧 UPDATING DOCUMENTS TABLE');
  console.log('='.repeat(60));

  // First, check existing documents
  console.log('\n1️⃣ Checking existing documents...');
  const checkSQL = `
    SELECT id, type, file_url, file_name, application_id
    FROM documents
    LIMIT 10;
  `;
  const checkResult = await executeSQL(checkSQL);

  if (checkResult && checkResult.data) {
    console.log(`Found ${checkResult.data.length} documents:`);
    checkResult.data.forEach(doc => {
      console.log(`  - ${doc.type}: ${doc.file_name} (URL: ${doc.file_url?.substring(0, 50)}...)`);
    });
  }

  // Add file_path column if it doesn't exist
  console.log('\n2️⃣ Adding file_path column...');
  const addColumnSQL = `
    ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS file_path TEXT;
  `;
  const addResult = await executeSQL(addColumnSQL);

  if (addResult && !addResult.error) {
    console.log('✅ file_path column added (or already exists)');
  } else {
    console.log('⚠️ Could not add file_path column:', addResult?.error);
  }

  // For documents with local file URLs, extract potential storage path
  console.log('\n3️⃣ Migrating file URLs to file_path...');

  // Check if any documents have file URLs that look like storage paths
  const migrateSQL = `
    UPDATE documents
    SET file_path =
      CASE
        -- If file_url contains application ID and filename pattern
        WHEN file_url IS NOT NULL
          AND file_url NOT LIKE 'http%'
          AND file_url NOT LIKE 'file://%'
        THEN file_url

        -- Extract path from file URL if it contains the pattern
        WHEN file_url LIKE '%/%'
          AND file_url NOT LIKE 'http%'
          AND file_url NOT LIKE 'file://%'
        THEN file_url

        -- Try to construct path from application_id and file_name
        WHEN application_id IS NOT NULL
          AND file_name IS NOT NULL
          AND file_url IS NOT NULL
        THEN application_id::text || '/' || file_name

        ELSE NULL
      END
    WHERE file_path IS NULL
    AND file_url IS NOT NULL;
  `;

  const migrateResult = await executeSQL(migrateSQL);
  if (migrateResult && !migrateResult.error) {
    console.log('✅ Migration attempted');
  }

  // Check the results
  console.log('\n4️⃣ Checking updated documents...');
  const finalCheckSQL = `
    SELECT
      id,
      type,
      file_name,
      file_url,
      file_path,
      CASE
        WHEN file_path IS NOT NULL THEN 'Has storage path'
        WHEN file_url LIKE 'http%' THEN 'Has HTTP URL'
        WHEN file_url LIKE 'file://%' THEN 'Has local file URL'
        ELSE 'No valid storage'
      END as storage_status
    FROM documents;
  `;

  const finalResult = await executeSQL(finalCheckSQL);
  if (finalResult && finalResult.data) {
    console.log('\nDocument Storage Status:');
    finalResult.data.forEach(doc => {
      console.log(`  ${doc.type}: ${doc.storage_status}`);
      if (doc.file_path) {
        console.log(`    Path: ${doc.file_path}`);
      }
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ TABLE UPDATE COMPLETE');
  console.log('\nNOTE: Documents with local file URLs will need to be re-uploaded');
  console.log('to use the new Supabase Storage system.');
}

updateDocumentsTable().catch(console.error);