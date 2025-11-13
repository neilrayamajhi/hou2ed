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

async function checkDocuments() {
  console.log('🔍 DETAILED DOCUMENT CHECK');
  console.log('='.repeat(60));

  // Get all documents with full details
  const sql = `
    SELECT *
    FROM documents
    ORDER BY created_at DESC;
  `;

  const result = await executeSQL(sql);

  if (result && result.length > 0) {
    console.log(`Found ${result.length} documents:\n`);

    result.forEach((doc, index) => {
      console.log(`Document ${index + 1}:`);
      console.log(JSON.stringify(doc, null, 2));
      console.log('-'.repeat(40));
    });
  } else if (result && result.length === 0) {
    console.log('No documents found in the table');
  } else {
    console.log('Result:', JSON.stringify(result, null, 2));
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ CHECK COMPLETE');
}

checkDocuments().catch(console.error);