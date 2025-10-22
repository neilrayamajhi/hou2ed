#!/usr/bin/env node

const https = require('https');
const fs = require('fs');

// Read the SQL file
const sql = fs.readFileSync('/Users/neilrayamajhi/h2d/CREATE_MESSAGING_TABLES.sql', 'utf8');

// Supabase configuration
const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

// Split the SQL into individual statements
const statements = sql
  .split(/;\s*$/gm)
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`Found ${statements.length} SQL statements to execute`);

// Unfortunately, we can't execute DDL statements through the REST API with anon key
// We need the service role key or direct database access

console.log('\n❌ Cannot execute DDL statements (CREATE TABLE, ALTER TABLE) through REST API with anon key.');
console.log('\nTo run this migration, I need one of the following:');
console.log('1. Service Role Key (found in Supabase Dashboard > Settings > API)');
console.log('2. Database password (found in Supabase Dashboard > Settings > Database)');
console.log('3. Access to Supabase CLI with proper authentication');

console.log('\nLet me try using the Supabase CLI with linked project...');

const { exec } = require('child_process');

// Try to run through Supabase CLI
exec('cd /Users/neilrayamajhi/h2d/app && npx supabase db push --linked < /Users/neilrayamajhi/h2d/CREATE_MESSAGING_TABLES.sql', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    console.error('Unable to run migration through CLI');

    console.log('\n📋 The SQL migration has been copied to your clipboard.');
    console.log('Please go to: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/sql/new');
    console.log('And paste the SQL to run it.');
    return;
  }

  if (stderr) {
    console.error(`stderr: ${stderr}`);
  }

  console.log(`stdout: ${stdout}`);
  console.log('✅ Migration completed successfully!');
});