const fetch = require('node-fetch');
const fs = require('fs');

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
      console.log(`   Response: ${result.substring(0, 200)}...`);
      return false;
    }

    console.log('   ✅ Success');
    return true;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function applyProviderPolicies() {
  console.log('🔧 ADDING PROVIDER RLS POLICIES');
  console.log('='.repeat(50));
  console.log('');

  // Read the SQL file
  const sqlContent = fs.readFileSync('add-provider-policies.sql', 'utf8');

  // Split into individual statements
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements to execute\n`);

  let successCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';
    const preview = statement.substring(0, 80).replace(/\n/g, ' ');

    console.log(`[${i + 1}/${statements.length}] ${preview}...`);

    if (await executeSQL(statement)) {
      successCount++;
    }

    // Small delay between statements
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('');
  console.log('='.repeat(50));
  console.log(`\n✅ Successfully executed: ${successCount}/${statements.length} statements\n`);

  if (successCount === statements.length) {
    console.log('🎉 PROVIDER POLICIES HAVE BEEN ADDED!\n');
    console.log('What was added:');
    console.log('  1. ✅ Providers can VIEW applications for their listings');
    console.log('  2. ✅ Providers can UPDATE applications (approve/reject)');
    console.log('  3. ✅ Updated provider role for c5019ab8-dba5-41b7-89fa-c7b23da81af6');
    console.log('');
    console.log('📋 HOW TO TEST:');
    console.log('  1. Log in as: samsonyahdel@gmail.com');
    console.log('  2. This user owns the "Neil house" listing');
    console.log('  3. They should now see the application in the Applications screen');
    console.log('');
    console.log('📝 IMPORTANT NOTES:');
    console.log('  - The ApplicationsListScreen might need updating to show');
    console.log('    applications differently for providers vs seekers');
    console.log('  - Providers see applications FOR their listings');
    console.log('  - Seekers see applications THEY submitted');
  } else {
    console.log('⚠️  Some statements failed. Check the errors above.');
  }
}

applyProviderPolicies().catch(console.error);