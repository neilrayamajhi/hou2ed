// Fix documents table RLS policies
const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
const ACCESS_TOKEN = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!PROJECT_REF || !ACCESS_TOKEN) {
  console.error('❌ Missing environment variables!');
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

async function fixDocumentsRLS() {
  console.log('🔧 FIXING DOCUMENTS TABLE RLS POLICIES');
  console.log('='.repeat(60));

  // First, check existing policies
  console.log('\n1️⃣ Checking existing policies...');
  const checkSQL = `
    SELECT
      polname as policy_name,
      polcmd as command,
      qual as using_clause,
      with_check as with_check_clause
    FROM pg_policies
    WHERE tablename = 'documents';
  `;

  const policies = await executeSQL(checkSQL);
  if (policies && policies.length > 0) {
    console.log('\nExisting policies:');
    policies.forEach(p => {
      console.log(`  - ${p.policy_name} (${p.command})`);
    });
  }

  // Drop existing policies
  console.log('\n2️⃣ Dropping existing policies...');
  const dropSQL = `
    DROP POLICY IF EXISTS "Users can view application documents" ON documents;
    DROP POLICY IF EXISTS "Users can insert application documents" ON documents;
    DROP POLICY IF EXISTS "Users can update their documents" ON documents;
    DROP POLICY IF EXISTS "Users can delete their documents" ON documents;
    DROP POLICY IF EXISTS "Providers can view documents" ON documents;
    DROP POLICY IF EXISTS "Seekers can manage their documents" ON documents;
    DROP POLICY IF EXISTS "Users can manage their own documents" ON documents;
  `;
  await executeSQL(dropSQL);

  // Create comprehensive RLS policies
  console.log('\n3️⃣ Creating new RLS policies...');

  // Policy 1: Seekers can insert documents for their applications
  const insertPolicy = `
    CREATE POLICY "Seekers can insert documents"
    ON documents FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM applications
        WHERE applications.id = documents.application_id
        AND applications.seeker_id = auth.uid()
      )
    );
  `;
  await executeSQL(insertPolicy);
  console.log('  ✅ Created insert policy for seekers');

  // Policy 2: Seekers can view their own documents
  const seekerViewPolicy = `
    CREATE POLICY "Seekers can view own documents"
    ON documents FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM applications
        WHERE applications.id = documents.application_id
        AND applications.seeker_id = auth.uid()
      )
    );
  `;
  await executeSQL(seekerViewPolicy);
  console.log('  ✅ Created view policy for seekers');

  // Policy 3: Providers can view documents for applications to their listings
  const providerViewPolicy = `
    CREATE POLICY "Providers can view application documents"
    ON documents FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM applications
        JOIN listings ON applications.listing_id = listings.id
        WHERE applications.id = documents.application_id
        AND listings.provider_id = auth.uid()
      )
    );
  `;
  await executeSQL(providerViewPolicy);
  console.log('  ✅ Created view policy for providers');

  // Policy 4: Seekers can update their own documents
  const updatePolicy = `
    CREATE POLICY "Seekers can update own documents"
    ON documents FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM applications
        WHERE applications.id = documents.application_id
        AND applications.seeker_id = auth.uid()
      )
    );
  `;
  await executeSQL(updatePolicy);
  console.log('  ✅ Created update policy for seekers');

  // Policy 5: Seekers can delete their own documents
  const deletePolicy = `
    CREATE POLICY "Seekers can delete own documents"
    ON documents FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM applications
        WHERE applications.id = documents.application_id
        AND applications.seeker_id = auth.uid()
      )
    );
  `;
  await executeSQL(deletePolicy);
  console.log('  ✅ Created delete policy for seekers');

  // Enable RLS
  console.log('\n4️⃣ Ensuring RLS is enabled...');
  const enableRLS = `
    ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
  `;
  await executeSQL(enableRLS);

  // Test the policies
  console.log('\n5️⃣ Verifying new policies...');
  const verifySQL = `
    SELECT
      COUNT(*) as policy_count
    FROM pg_policies
    WHERE tablename = 'documents';
  `;
  const verifyResult = await executeSQL(verifySQL);
  if (verifyResult && verifyResult[0]) {
    console.log(`  ✅ Created ${verifyResult[0].policy_count} policies for documents table`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ DOCUMENTS RLS POLICIES FIXED!');
  console.log('\nSeekers can now:');
  console.log('  • Upload documents for their applications');
  console.log('  • View their own documents');
  console.log('  • Update/delete their documents');
  console.log('\nProviders can now:');
  console.log('  • View documents for applications to their listings');
}

fixDocumentsRLS().catch(console.error);