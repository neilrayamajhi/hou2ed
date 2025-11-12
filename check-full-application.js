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

async function checkFullApplication() {
  console.log('🔍 CHECKING FULL APPLICATION STRUCTURE');
  console.log('='.repeat(60));
  console.log('');

  // Get ALL columns from the application
  const appSQL = `
    SELECT * FROM applications
    WHERE id = '0f1b7a74-5df9-4106-b955-5d23e2414143'
    LIMIT 1;
  `;

  const appResult = await executeSQL(appSQL);

  if (appResult && appResult.length > 0) {
    const app = appResult[0];

    console.log('📋 Full Application Data:');
    console.log('');

    Object.keys(app).forEach(key => {
      const value = app[key];

      if (value === null) {
        console.log(`${key}: NULL`);
      } else if (typeof value === 'object') {
        console.log(`${key}: ${JSON.stringify(value)}`);
      } else {
        console.log(`${key}: ${value}`);
      }
    });
  } else {
    console.log('❌ Application not found');
  }

  // Check table structure
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Applications Table Columns:');

  const columnsSQL = `
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'applications'
    ORDER BY ordinal_position;
  `;

  const columnsResult = await executeSQL(columnsSQL);

  if (columnsResult && columnsResult.length > 0) {
    columnsResult.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
  }
}

checkFullApplication().catch(console.error);