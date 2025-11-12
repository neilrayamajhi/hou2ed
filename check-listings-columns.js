const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkListingsColumns() {
  console.log('🔍 Checking listings table structure...\n');

  try {
    // Fetch a single row to see the structure
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error:', error);
      return;
    }

    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log('✅ Available columns in listings table:');
      console.log('=' .repeat(40));
      columns.forEach(col => {
        const value = data[0][col];
        const type = value === null ? 'null' : typeof value;
        console.log(`  - ${col} (${type})`);
      });
      console.log('=' .repeat(40));

      // Check for specific columns we're looking for
      const checkColumns = ['district', 'island', 'city', 'state', 'address', 'title', 'name'];
      console.log('\n📋 Checking specific columns:');
      checkColumns.forEach(col => {
        if (columns.includes(col)) {
          console.log(`  ✅ ${col} exists`);
        } else {
          console.log(`  ❌ ${col} does NOT exist`);
        }
      });
    } else {
      console.log('No data in listings table to check structure');
    }

  } catch (err) {
    console.error('Error:', err);
  }
}

checkListingsColumns();