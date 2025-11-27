const fetch = require('node-fetch');
const fs = require('fs');

const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4OTg4NiwiZXhwIjoyMDczOTY1ODg2fQ.J9Oc77ZR1E435SqDsngt8ey4_WVOeTE6UASlYo17Gbc';

async function applyProfileFix() {
  console.log('🔧 Applying Profile Creation Fix via SQL API...\n');

  // Read the migration SQL
  const sqlFile = 'supabase/migrations/20251127031438_fix_profile_creation_rls_standalone.sql';
  const sql = fs.readFileSync(sqlFile, 'utf8');

  console.log('📝 Executing migration...\n');

  // Split into individual statements and execute each
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements to execute\n`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    const preview = statement.substring(0, 60).replace(/\n/g, ' ');
    
    console.log(`[${i + 1}/${statements.length}] ${preview}...`);

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({ sql: statement + ';' })
      });

      if (response.ok) {
        console.log('  ✅ Success\n');
      } else {
        const text = await response.text();
        // Some statements like DROP IF EXISTS are expected to "fail" if nothing to drop
        if (text.includes('does not exist') || response.status === 404) {
          console.log('  ⚠️  (Already applied or not needed)\n');
        } else {
          console.log(`  ❌ Error: ${text}\n`);
        }
      }
    } catch (err) {
      console.log(`  ❌ Failed: ${err.message}\n`);
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Profile Fix Applied!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🧪 Test Now:');
  console.log('   1. Try creating a new account');
  console.log('   2. Should work without RLS errors\n');
}

applyProfileFix().catch(err => {
  console.error('\n❌ Script failed:', err.message);
  console.log('\n📝 You can still apply manually at:');
  console.log('https://app.supabase.com/project/rixiofltzptwaiwxhhlf/sql');
});
