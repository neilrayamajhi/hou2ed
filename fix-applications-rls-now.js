const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Your project details from .env
const PROJECT_REF = 'rixiofltzptwaiwxhhlf';
const ACCESS_TOKEN = 'sbp_b587d82512ccd48326fa62de11a9e5e94bf1688a';

async function executeSQL(sql) {
  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: sql,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to execute SQL: ${response.status} - ${error}`);
  }

  return await response.json();
}

async function applyRLSFix() {
  console.log('🔧 Applying RLS fix for applications table...\n');
  console.log('Project: ', PROJECT_REF);
  console.log('URL: https://rixiofltzptwaiwxhhlf.supabase.co/\n');

  // Read the SQL migration file
  const sqlPath = path.join(__dirname, 'supabase/migrations/20251111_fix_applications_rls.sql');
  const fullSQL = fs.readFileSync(sqlPath, 'utf8');

  // Split the SQL into individual statements (Supabase API might need them one at a time)
  const statements = fullSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';

    // Extract a description from the statement
    const firstLine = statement.split('\n')[0];
    const description = firstLine.length > 60
      ? firstLine.substring(0, 60) + '...'
      : firstLine;

    console.log(`[${i + 1}/${statements.length}] Executing: ${description}`);

    try {
      const result = await executeSQL(statement);
      console.log('   ✅ Success\n');
      successCount++;
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
      errorCount++;

      // For critical errors, stop execution
      if (error.message.includes('syntax error') || error.message.includes('does not exist')) {
        console.log('⚠️  Stopping due to critical error\n');
        break;
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Successfully executed: ${successCount} statements`);
  if (errorCount > 0) {
    console.log(`❌ Failed: ${errorCount} statements`);
  }
  console.log('='.repeat(50) + '\n');

  if (successCount > 0) {
    console.log('🎉 RLS policies have been updated!');
    console.log('\nNext steps:');
    console.log('1. Try submitting an application again');
    console.log('2. Make sure the logged-in user has role = "seeker" in profiles table');
    console.log('3. The seeker_id in the application should match auth.uid()');
  } else {
    console.log('❌ No policies were updated. You may need to apply the fix manually.');
    console.log('\nManual fix instructions:');
    console.log('1. Go to: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/sql/new');
    console.log('2. Copy the SQL from: supabase/migrations/20251111_fix_applications_rls.sql');
    console.log('3. Paste and run it in the SQL editor');
  }
}

// Check if node-fetch is installed
try {
  require.resolve('node-fetch');
  applyRLSFix().catch(console.error);
} catch(e) {
  console.log('📦 Installing required dependency: node-fetch\n');
  require('child_process').execSync('npm install node-fetch@2', { stdio: 'inherit' });
  console.log('\n✅ Dependency installed. Please run this script again:\n');
  console.log('   node fix-applications-rls-now.js\n');
}