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

async function checkApplication() {
  console.log('🔍 CHECKING APPLICATIONS WITH THOSE DOCUMENT NAMES');
  console.log('='.repeat(60));

  // Find the application with the document shown in screenshot
  const sql = `
    SELECT
      a.id as app_id,
      a.created_at as app_created,
      a.status,
      d.id as doc_id,
      d.file_name,
      d.file_path,
      d.file_url,
      d.type,
      d.created_at as doc_created
    FROM documents d
    JOIN applications a ON d.application_id = a.id
    WHERE d.file_name LIKE '%1762929656086%'
       OR d.file_name LIKE '%1762929651636%'
    ORDER BY a.created_at DESC;
  `;

  const result = await executeSQL(sql);

  if (result && result.length > 0) {
    console.log(`\nFound application with those documents:\n`);

    result.forEach((row, index) => {
      console.log(`Document ${index + 1}:`);
      console.log(`  Application ID: ${row.app_id}`);
      console.log(`  App Created: ${new Date(row.app_created).toLocaleString()}`);
      console.log(`  App Status: ${row.status}`);
      console.log(`  Document: ${row.file_name}`);
      console.log(`  File Path: ${row.file_path || '(null)'}`);
      console.log(`  File URL: ${row.file_url || '(null)'}`);

      if (!row.file_path || row.file_path === row.file_url) {
        console.log(`  ❌ This is an OLD document without proper storage path`);
      } else if (row.file_path?.includes('temp_')) {
        console.log(`  ❌ This has a temp path (from old upload system)`);
      } else {
        console.log(`  ✅ This has a valid storage path`);
      }
      console.log('-'.repeat(40));
    });
  } else {
    console.log('No documents found with those filenames');
  }

  // Get the most recent application
  console.log('\n' + '='.repeat(60));
  console.log('MOST RECENT APPLICATION:');

  const recentSQL = `
    SELECT
      a.id,
      a.created_at,
      a.status,
      COUNT(d.id) as doc_count
    FROM applications a
    LEFT JOIN documents d ON d.application_id = a.id
    GROUP BY a.id, a.created_at, a.status
    ORDER BY a.created_at DESC
    LIMIT 1;
  `;

  const recentResult = await executeSQL(recentSQL);

  if (recentResult && recentResult[0]) {
    const app = recentResult[0];
    console.log(`  ID: ${app.id}`);
    console.log(`  Created: ${new Date(app.created_at).toLocaleString()}`);
    console.log(`  Status: ${app.status}`);
    console.log(`  Documents: ${app.doc_count}`);

    // Get documents for this application
    const docsSQL = `
      SELECT file_name, file_path, type
      FROM documents
      WHERE application_id = '${app.id}';
    `;

    const docsResult = await executeSQL(docsSQL);
    if (docsResult && docsResult.length > 0) {
      console.log('\n  Documents:');
      docsResult.forEach(doc => {
        const hasValidPath = doc.file_path && !doc.file_path.includes('temp_');
        const status = hasValidPath ? '✅' : '❌';
        console.log(`    ${status} ${doc.type}: ${doc.file_name}`);
        if (doc.file_path) {
          console.log(`       Path: ${doc.file_path}`);
        }
      });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ CHECK COMPLETE');
  console.log('\nNOTE: If you\'re viewing an older application, those documents');
  console.log('were uploaded before the storage fix and won\'t be viewable.');
  console.log('The MOST RECENT application should have working documents.');
}

checkApplication().catch(console.error);