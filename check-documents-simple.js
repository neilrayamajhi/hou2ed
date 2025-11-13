const fetch = require('node-fetch');

const PROJECT_REF = 'rixiofltzptwaiwxhhlf';
const ACCESS_TOKEN = 'sbp_b587d82512ccd48326fa62de11a9e5e94bf1688a';

async function executeSQL(sql) {
  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

  try {
    console.log('Executing SQL...');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });

    const result = await response.json();
    console.log('Response:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.log(`Error: ${error.message}`);
    return null;
  }
}

async function checkDocuments() {
  console.log('🔍 CHECKING DOCUMENTS TABLE');
  console.log('='.repeat(60));

  // Simple count first
  const countSQL = `SELECT COUNT(*) as count FROM documents;`;
  console.log('Query:', countSQL);
  const countResult = await executeSQL(countSQL);

  // Check if table exists
  const tableSQL = `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'documents';
  `;
  console.log('\nChecking if documents table exists...');
  const tableResult = await executeSQL(tableSQL);

  // Get column info
  const columnsSQL = `
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'documents'
    ORDER BY ordinal_position;
  `;
  console.log('\nGetting column info...');
  const columnsResult = await executeSQL(columnsSQL);
}

checkDocuments().catch(console.error);