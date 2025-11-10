const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

// Use service role key to bypass RLS for admin operations
const supabaseUrl = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4OTg4NiwiZXhwIjoyMDczOTY1ODg2fQ.J9Oc77ZR1E435SqDsngt8ey4_WVOeTE6UASlYo17Gbc';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function applyFix() {
  console.log('🔧 Applying comprehensive listings visibility fix...\n');

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'fix-listings-visibility.sql');
    const sqlContent = await fs.readFile(sqlPath, 'utf8');

    // Split SQL into individual statements (simple split by semicolon)
    // Note: This is a simplified approach and may not work with complex SQL
    const statements = sqlContent
      .split(/;\s*$/m)
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim() + ';');

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];

      // Skip comments and empty statements
      if (stmt.startsWith('--') || stmt.trim() === ';') {
        continue;
      }

      // Show a preview of the statement
      const preview = stmt.substring(0, 80).replace(/\n/g, ' ');
      console.log(`${i + 1}. Executing: ${preview}...`);

      try {
        // For SELECT statements, use .rpc() or direct query
        if (stmt.toUpperCase().trim().startsWith('SELECT')) {
          // Skip verification SELECTs for now
          console.log('   (Skipping verification SELECT)');
        } else {
          // For DDL statements, we need to use the Management API
          // Since we can't execute raw SQL directly through Supabase JS client
          console.log('   (Would execute via Management API)');
        }
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('Since we cannot execute raw SQL through the JS client,');
    console.log('please run the following command to apply the fix:\n');
    console.log('Option 1 - Using Supabase CLI:');
    console.log('supabase db push --db-url "postgresql://postgres:' + serviceRoleKey + '@db.rixiofltzptwaiwxhhlf.supabase.co:5432/postgres" < fix-listings-visibility.sql\n');

    console.log('Option 2 - Using psql directly:');
    console.log('PGPASSWORD="' + serviceRoleKey + '" psql -h db.rixiofltzptwaiwxhhlf.supabase.co -p 5432 -U postgres -d postgres -f fix-listings-visibility.sql\n');

    console.log('Option 3 - Use Supabase Dashboard:');
    console.log('1. Go to https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/sql');
    console.log('2. Paste the contents of fix-listings-visibility.sql');
    console.log('3. Click "Run"\n');

    // Test current state
    console.log('Testing current state with anon key...');
    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';
    const anonSupabase = createClient(supabaseUrl, anonKey);

    const { data, error } = await anonSupabase
      .from('listings')
      .select('id, title, is_active')
      .eq('is_active', true);

    if (error) {
      console.log('❌ Anon users still cannot see listings:', error.message);
    } else {
      console.log(`Current state: Anon users can see ${data?.length || 0} active listings`);
      if (data && data.length > 0) {
        console.log('Visible listings:', data.map(l => l.title).join(', '));
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

applyFix();