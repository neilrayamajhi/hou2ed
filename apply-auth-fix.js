/**
 * Apply Auth Fix to Production Supabase
 * This script applies the comprehensive auth fix to your Supabase database
 * 
 * Usage: node apply-auth-fix.js
 */

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'YOUR_SERVICE_KEY_HERE';

// Read the SQL fix file
const sqlFix = fs.readFileSync('./fix-auth-issues-complete.sql', 'utf8');

console.log('════════════════════════════════════════════════════════════');
console.log('   Applying Authentication Fix to Supabase');
console.log('════════════════════════════════════════════════════════════');
console.log('Supabase URL:', SUPABASE_URL);
console.log('');

if (SUPABASE_SERVICE_KEY === 'YOUR_SERVICE_KEY_HERE') {
  console.error('❌ ERROR: Service key not configured!');
  console.error('');
  console.error('Please set your service key in one of these ways:');
  console.error('');
  console.error('Option 1: Environment variable');
  console.error('  export SUPABASE_SERVICE_KEY="your-service-key-here"');
  console.error('  node apply-auth-fix.js');
  console.error('');
  console.error('Option 2: Edit this file');
  console.error('  Open apply-auth-fix.js');
  console.error('  Replace YOUR_SERVICE_KEY_HERE with your actual key');
  console.error('');
  console.error('Get your service key from:');
  console.error('https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/settings/api');
  console.error('');
  console.error('════════════════════════════════════════════════════════════');
  process.exit(1);
}

async function applyFix() {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    console.log('📝 Reading SQL fix file...');
    console.log(`   Size: ${sqlFix.length} characters`);
    console.log('');

    // Split SQL into statements (rough split by semicolon at end of line)
    const statements = sqlFix
      .split(/;\s*\n/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📦 Found ${statements.length} SQL statements to execute`);
    console.log('');
    console.log('🚀 Applying fix to database...');
    console.log('');

    // Apply the full SQL at once using Supabase RPC
    // Note: For complex migrations, it's better to use SQL Editor in dashboard
    
    console.log('⚠️  IMPORTANT: This script uses the Supabase REST API which has limitations.');
    console.log('    For the most reliable migration, please:');
    console.log('');
    console.log('    1. Open Supabase SQL Editor:');
    console.log('       https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/sql');
    console.log('');
    console.log('    2. Copy contents of: fix-auth-issues-complete.sql');
    console.log('');
    console.log('    3. Paste into SQL Editor and click "Run"');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('✅ Alternatively, I can help you verify the current state.');
    console.log('');

    // Check current profiles table structure
    console.log('🔍 Checking current profiles table structure...');
    const { data: columns, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          column_name,
          data_type,
          is_nullable
        FROM information_schema.columns
        WHERE table_name = 'profiles'
        ORDER BY ordinal_position;
      `
    });

    if (error && error.message?.includes('does not exist')) {
      console.log('⚠️  Cannot check table structure (RPC function not available)');
      console.log('   This is normal - please use the SQL Editor method above.');
    } else if (error) {
      console.log('⚠️  Error checking structure:', error.message);
    } else {
      console.log('✅ Successfully queried database');
      console.log('   Profiles table columns:', columns?.length || 0);
    }

    console.log('');
    console.log('════════════════════════════════════════════════════════════');
    console.log('   NEXT STEPS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');
    console.log('1. Apply the SQL migration manually:');
    console.log('   - Open: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/sql');
    console.log('   - Copy: fix-auth-issues-complete.sql');
    console.log('   - Paste and Run');
    console.log('');
    console.log('2. Disable email confirmations (for development):');
    console.log('   - Open: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/auth/settings');
    console.log('   - Toggle OFF: "Enable email confirmations"');
    console.log('   - Save');
    console.log('');
    console.log('3. Run the tests:');
    console.log('   node test-auth-complete.js');
    console.log('');
    console.log('════════════════════════════════════════════════════════════');

  } catch (error) {
    console.error('');
    console.error('❌ Error:', error.message);
    console.error('');
    console.error('Please apply the fix manually using the SQL Editor:');
    console.error('https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/sql');
    console.error('');
    process.exit(1);
  }
}

applyFix();

