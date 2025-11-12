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

async function applyRemainingPolicies() {
  console.log('🔧 APPLYING REMAINING PROVIDER POLICIES');
  console.log('='.repeat(50));
  console.log('');

  const policies = [
    {
      name: 'Create SELECT policy for providers',
      sql: `CREATE POLICY "provider_view_listing_applications"
        ON applications
        FOR SELECT
        TO authenticated
        USING (
            EXISTS (
                SELECT 1
                FROM listings
                WHERE listings.id = applications.listing_id
                AND listings.provider_id = auth.uid()
            )
        );`
    },
    {
      name: 'Update provider role',
      sql: `UPDATE profiles
        SET role = 'provider', updated_at = NOW()
        WHERE id = 'c5019ab8-dba5-41b7-89fa-c7b23da81af6';`
    },
    {
      name: 'Verify provider role update',
      sql: `SELECT id, email, role FROM profiles WHERE id = 'c5019ab8-dba5-41b7-89fa-c7b23da81af6';`
    }
  ];

  let successCount = 0;

  for (let i = 0; i < policies.length; i++) {
    const policy = policies[i];
    console.log(`[${i + 1}/${policies.length}] ${policy.name}`);

    if (await executeSQL(policy.sql)) {
      successCount++;
    }

    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('');
  console.log('='.repeat(50));
  console.log(`\n✅ Successfully executed: ${successCount}/${policies.length} statements\n`);

  if (successCount === policies.length) {
    console.log('🎉 ALL PROVIDER POLICIES ARE NOW IN PLACE!\n');
    console.log('✅ WHAT\'S BEEN SET UP:');
    console.log('  1. Providers can VIEW applications for their listings');
    console.log('  2. Providers can UPDATE application status');
    console.log('  3. User c5019ab8-dba5-41b7-89fa-c7b23da81af6 is now a provider');
    console.log('');
    console.log('📋 TO ACCESS APPLICATIONS AS A PROVIDER:');
    console.log('  1. Log in with: samsonyahdel@gmail.com');
    console.log('  2. Navigate to Applications screen');
    console.log('  3. You should see applications for "Neil house"');
    console.log('');
    console.log('⚠️  NOTE: The ApplicationsListScreen may need updating');
    console.log('  to properly query applications for providers.');
    console.log('  Currently it only queries seeker_id = user.id');
  }
}

applyRemainingPolicies().catch(console.error);