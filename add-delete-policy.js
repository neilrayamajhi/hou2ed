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

async function addDeletePolicy() {
  console.log('🔧 ADDING DELETE POLICY FOR APPLICATIONS');
  console.log('='.repeat(60));
  console.log('');

  // Create delete policy for seekers to delete their own applications
  const deletePolicySQL = `
    CREATE POLICY IF NOT EXISTS "Seekers can delete their own applications"
    ON applications FOR DELETE
    TO authenticated
    USING (
      seeker_id = auth.uid()
      AND status IN ('new', 'withdrawn', 'rejected', 'draft')
    );
  `;

  console.log('Creating delete policy...');
  const result = await executeSQL(deletePolicySQL);

  if (result && !result.error) {
    console.log('✅ Delete policy created successfully');
    console.log('');
    console.log('Seekers can now delete their own applications with status:');
    console.log('- new');
    console.log('- withdrawn');
    console.log('- rejected');
    console.log('- draft');
    console.log('');
    console.log('Note: Approved or under review applications cannot be deleted.');
  } else {
    console.log('❌ Failed to create delete policy');
  }
}

addDeletePolicy().catch(console.error);