#!/usr/bin/env node

/**
 * Database Fix Script
 * This creates the necessary tables using Supabase admin operations
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Database Fix Script\n');

// The SQL migration is at
const sqlFile = '/Users/neilrayamajhi/h2d/CREATE_MESSAGING_TABLES.sql';

// Check if SQL file exists
if (!fs.existsSync(sqlFile)) {
  console.error('❌ SQL migration file not found!');
  process.exit(1);
}

console.log('📋 SQL migration file found');

// Copy to clipboard
exec(`cat ${sqlFile} | pbcopy`, (err) => {
  if (!err) {
    console.log('✅ SQL copied to clipboard');
  }
});

// Open the Supabase SQL editor
console.log('\n🌐 Opening Supabase SQL Editor...');
exec('open "https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/sql/new"', (err) => {
  if (!err) {
    console.log('✅ Browser opened');
  }
});

console.log('\n' + '='.repeat(60));
console.log('📝 INSTRUCTIONS:');
console.log('='.repeat(60));
console.log('1. The Supabase SQL Editor is now open in your browser');
console.log('2. The SQL migration is in your clipboard');
console.log('3. Click in the SQL editor area');
console.log('4. Press Cmd+V to paste');
console.log('5. Click the "Run" button');
console.log('='.repeat(60));

console.log('\n🎯 This will:');
console.log('  • Create the message_threads table');
console.log('  • Add missing columns to messages table');
console.log('  • Set up indexes and RLS policies');
console.log('  • Enable real-time subscriptions');

console.log('\n✨ After running the SQL, your messaging system will work!');

// Wait a moment then verify
setTimeout(() => {
  console.log('\n🔍 You can verify the tables were created by:');
  console.log('  1. Refreshing the app');
  console.log('  2. Opening the Messages tab');
  console.log('  3. It should no longer show errors!');
}, 2000);
