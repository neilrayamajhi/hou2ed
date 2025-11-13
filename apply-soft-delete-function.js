// Create soft delete function using Supabase API
const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
const ACCESS_TOKEN = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!PROJECT_REF || !ACCESS_TOKEN) {
  console.error('❌ Missing environment variables!');
  console.error('Please create a .env.local file with SUPABASE_PROJECT_REF and SUPABASE_SERVICE_ROLE_KEY');
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

async function createSoftDeleteFunction() {
  console.log('🔧 Creating soft delete function for applications');
  console.log('='.repeat(60));

  // First, ensure deleted_at column exists
  console.log('\n1️⃣ Ensuring deleted_at column exists...');
  const addColumnSQL = `
    ALTER TABLE applications
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
  `;
  await executeSQL(addColumnSQL);

  // Create the soft delete function
  console.log('\n2️⃣ Creating soft_delete_application function...');
  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION soft_delete_application(application_id UUID)
    RETURNS void AS $$
    BEGIN
      UPDATE applications
      SET
        deleted_at = NOW(),
        status = 'withdrawn'
      WHERE id = application_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;

  const functionResult = await executeSQL(createFunctionSQL);
  if (functionResult && !functionResult.error) {
    console.log('✅ Function created successfully!');
  }

  // Grant execute permission
  console.log('\n3️⃣ Granting execute permissions...');
  const grantSQL = `
    GRANT EXECUTE ON FUNCTION soft_delete_application TO authenticated;
  `;
  await executeSQL(grantSQL);

  // Test the function
  console.log('\n4️⃣ Testing function (dry run - no actual deletion)...');
  const testSQL = `
    SELECT
      routine_name,
      routine_type,
      data_type
    FROM information_schema.routines
    WHERE routine_name = 'soft_delete_application';
  `;

  const testResult = await executeSQL(testSQL);
  if (testResult && testResult.length > 0) {
    console.log('✅ Function exists and is ready to use!');
    console.log('   Function details:', testResult[0]);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ SETUP COMPLETE!');
  console.log('\nYou can now delete applications and they will be soft-deleted.');
  console.log('The function will:');
  console.log('  1. Set deleted_at timestamp');
  console.log('  2. Mark status as "withdrawn"');
}

createSoftDeleteFunction().catch(console.error);