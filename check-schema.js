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

async function checkSchema() {
  console.log('📊 CHECKING APPLICATIONS TABLE SCHEMA');
  console.log('='.repeat(60));
  console.log('');

  const schemaSQL = `
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'applications'
    ORDER BY ordinal_position;
  `;

  const columns = await executeSQL(schemaSQL);

  if (columns && columns.length > 0) {
    console.log('Columns in applications table:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
  }
}

checkSchema().catch(console.error);