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

async function debugApplicationData() {
  console.log('🔍 DEBUGGING APPLICATION DATA STRUCTURE');
  console.log('='.repeat(60));
  console.log('');

  // Get the application with all its data
  const appSQL = `
    SELECT
      id,
      listing_id,
      seeker_id,
      status,
      application_data,
      documents,
      notes,
      created_at
    FROM applications
    WHERE id = '0f1b7a74-5df9-4106-b955-5d23e2414143'
    LIMIT 1;
  `;

  const appResult = await executeSQL(appSQL);

  if (appResult && appResult.length > 0) {
    const app = appResult[0];

    console.log('📋 Application ID:', app.id);
    console.log('   Status:', app.status);
    console.log('   Created:', app.created_at);
    console.log('');

    console.log('📊 Application Data Field:');
    if (app.application_data) {
      const data = typeof app.application_data === 'string'
        ? JSON.parse(app.application_data)
        : app.application_data;

      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('   No application_data');
    }

    console.log('');
    console.log('📄 Documents Field:');
    if (app.documents) {
      const docs = typeof app.documents === 'string'
        ? JSON.parse(app.documents)
        : app.documents;

      console.log(JSON.stringify(docs, null, 2));
    } else {
      console.log('   No documents in main field');
    }
  }

  // Also check the separate documents table
  console.log('');
  console.log('📂 Checking documents table:');

  const docsSQL = `
    SELECT
      id,
      application_id,
      type,
      file_url,
      file_name,
      status,
      uploaded_at
    FROM documents
    WHERE application_id = '0f1b7a74-5df9-4106-b955-5d23e2414143';
  `;

  const docsResult = await executeSQL(docsSQL);

  if (docsResult && docsResult.length > 0) {
    console.log(`   ✅ Found ${docsResult.length} documents in documents table:`);
    docsResult.forEach((doc, i) => {
      console.log(`   ${i + 1}. ${doc.type || 'Unknown type'}`);
      console.log(`      File: ${doc.file_name || 'No name'}`);
      console.log(`      URL: ${doc.file_url ? 'Present' : 'Missing'}`);
      console.log(`      Status: ${doc.status}`);
    });
  } else {
    console.log('   ❌ No documents found in documents table');
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('');
  console.log('📝 FINDINGS:');
  console.log('- Check if phone is in application_data');
  console.log('- Check if documents are in JSONB field or separate table');
  console.log('- Update the code to fetch from the correct location');
}

debugApplicationData().catch(console.error);