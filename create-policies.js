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

    const result = await response.text();

    if (!response.ok) {
      console.log(`   ❌ Error: ${response.status}`);
      console.log(`   Response: ${result}`);
      return false;
    }

    console.log('   ✅ Success');
    return true;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function createPolicies() {
  console.log('🔧 CREATING NEW RLS POLICIES FOR APPLICATIONS TABLE');
  console.log('='.repeat(50));
  console.log('');

  const policies = [
    {
      name: 'Enable RLS',
      sql: 'ALTER TABLE applications ENABLE ROW LEVEL SECURITY;'
    },
    {
      name: 'Grant permissions',
      sql: 'GRANT ALL ON applications TO authenticated;'
    },
    {
      name: 'Grant sequence permissions',
      sql: 'GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;'
    },
    {
      name: 'INSERT policy for seekers',
      sql: `CREATE POLICY "simple_seeker_insert"
        ON applications
        FOR INSERT
        TO authenticated
        WITH CHECK (seeker_id = auth.uid());`
    },
    {
      name: 'SELECT policy for seekers',
      sql: `CREATE POLICY "simple_seeker_select"
        ON applications
        FOR SELECT
        TO authenticated
        USING (seeker_id = auth.uid());`
    },
    {
      name: 'UPDATE policy for seekers',
      sql: `CREATE POLICY "simple_seeker_update"
        ON applications
        FOR UPDATE
        TO authenticated
        USING (seeker_id = auth.uid())
        WITH CHECK (seeker_id = auth.uid());`
    },
    {
      name: 'DELETE policy for seekers',
      sql: `CREATE POLICY "simple_seeker_delete"
        ON applications
        FOR DELETE
        TO authenticated
        USING (seeker_id = auth.uid());`
    }
  ];

  let successCount = 0;

  for (let i = 0; i < policies.length; i++) {
    const policy = policies[i];
    console.log(`[${i + 1}/${policies.length}] Creating: ${policy.name}`);

    if (await executeSQL(policy.sql)) {
      successCount++;
    }

    // Small delay between statements
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('');
  console.log('='.repeat(50));
  console.log(`\n✅ Successfully created: ${successCount}/${policies.length} policies\n`);

  if (successCount === policies.length) {
    console.log('🎉 ALL POLICIES CREATED SUCCESSFULLY!\n');
    console.log('The applications table now has simple policies that:');
    console.log('  ✓ Allow authenticated users to INSERT when seeker_id = auth.uid()');
    console.log('  ✓ Allow users to SELECT their own applications');
    console.log('  ✓ Allow users to UPDATE their own applications');
    console.log('  ✓ Allow users to DELETE their own applications\n');
    console.log('📋 TEST NOW:');
    console.log('  Try submitting the application again in your app!\n');
    console.log('🔍 If it still fails:');
    console.log('  1. Check that user is authenticated');
    console.log('  2. Verify seeker_id = "31c57c00-777e-4e29-b6e9-4a8c2ef6698c"');
    console.log('  3. Check the browser console for detailed errors\n');
  } else {
    console.log('⚠️  Some policies failed to create.');
    console.log('Check the errors above and the Supabase dashboard.');
  }
}

createPolicies().catch(console.error);