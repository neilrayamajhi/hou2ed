/**
 * Check the ACTUAL current schema - not assumptions
 * This will tell us exactly what column names exist
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkSchema() {
  console.log('════════════════════════════════════════════════════════════');
  console.log('   Checking ACTUAL Current Schema');
  console.log('════════════════════════════════════════════════════════════\n');

  try {
    // Try to query profiles table
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (error) {
      console.log('❌ Error querying profiles:', error.message);
      
      // Try to get more details
      if (error.message.includes('user_id')) {
        console.log('\n✅ Table uses: user_id column');
      } else if (error.message.includes('id')) {
        console.log('\n✅ Table uses: id column');
      }
      
      return;
    }

    if (profiles && profiles.length > 0) {
      console.log('✅ Successfully queried profiles table\n');
      console.log('📊 Actual columns in first profile:');
      console.log('─────────────────────────────────────────────────────────\n');
      
      const profile = profiles[0];
      const columns = Object.keys(profile);
      
      // Check for key columns
      const hasId = columns.includes('id');
      const hasUserId = columns.includes('user_id');
      
      console.log('Key columns:');
      console.log(`  ${hasId ? '✅' : '❌'} id`);
      console.log(`  ${hasUserId ? '✅' : '❌'} user_id`);
      console.log('');
      console.log('All columns:');
      columns.forEach(col => {
        console.log(`  - ${col}`);
      });
      
      console.log('\n─────────────────────────────────────────────────────────');
      console.log('\n💡 Recommendation:');
      
      if (hasId && !hasUserId) {
        console.log('   Your code changes are CORRECT');
        console.log('   Table uses "id" as primary key');
      } else if (hasUserId && !hasId) {
        console.log('   ⚠️  REVERT CODE CHANGES!');
        console.log('   Table uses "user_id", not "id"');
        console.log('   My changes broke your working setup!');
      } else if (hasId && hasUserId) {
        console.log('   Table has BOTH id and user_id');
        console.log('   Need to check which is the primary key');
      } else {
        console.log('   ⚠️  Neither id nor user_id found - unusual setup');
      }
      
    } else {
      console.log('⚠️  No profiles found in table (empty table)');
      console.log('   Cannot determine column structure');
      console.log('   Try creating a test profile first');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }

  console.log('\n════════════════════════════════════════════════════════════\n');
}

checkSchema();

