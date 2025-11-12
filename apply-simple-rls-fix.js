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
      console.log(`   Response: ${result.substring(0, 100)}...`);
      return false;
    }

    console.log('   ✅ Success');
    return true;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function applyFix() {
  console.log('🚨 APPLYING SIMPLE RLS FIX FOR APPLICATIONS TABLE');
  console.log('='.repeat(50));
  console.log('');

  // Read the SQL file
  const sqlContent = fs.readFileSync('simple-rls-fix.sql', 'utf8');

  // Split into individual statements
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements to execute\n`);

  let successCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';
    const preview = statement.substring(0, 60).replace(/\n/g, ' ');

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
    console.log('🎉 ALL POLICIES HAVE BEEN RESET!\n');
    console.log('The applications table now has simplified RLS policies that:');
    console.log('  1. Allow any authenticated user to insert if seeker_id = auth.uid()');
    console.log('  2. Allow users to view their own applications');
    console.log('  3. Allow users to update their own applications\n');
    console.log('📋 To test:');
    console.log('  1. Make sure user ID 31c57c00-777e-4e29-b6e9-4a8c2ef6698c is authenticated');
    console.log('  2. Ensure seeker_id is set to this same ID');
    console.log('  3. Try submitting the application again\n');
    console.log('🔍 Check user role with this SQL:');
    console.log('  SELECT * FROM profiles WHERE id = \'31c57c00-777e-4e29-b6e9-4a8c2ef6698c\'\n');
  } else {
    console.log('⚠️  Some statements failed. Check the Supabase dashboard for current policies.');
  }
}

// Check if node-fetch is installed
const checkAndRun = async () => {
  try {
    require.resolve('node-fetch');
    await applyFix();
  } catch (e) {
    console.log('📦 Installing node-fetch...');
    require('child_process').execSync('npm install node-fetch@2', { stdio: 'inherit' });
    console.log('\nPlease run this script again: node apply-simple-rls-fix.js');
  }
};

checkAndRun().catch(console.error);