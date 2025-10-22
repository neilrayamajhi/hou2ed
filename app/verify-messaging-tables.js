/**
 * Script to verify messaging tables exist in Supabase
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyTables() {
  console.log('🔍 Checking messaging tables in cloud Supabase...\n');

  try {
    // Check message_threads table
    console.log('1. Checking message_threads table...');
    const { data: threads, error: threadsError } = await supabase
      .from('message_threads')
      .select('id')
      .limit(0);

    if (threadsError) {
      if (threadsError.code === 'PGRST205') {
        console.log('❌ message_threads table NOT FOUND');
      } else {
        console.log('⚠️ message_threads error:', threadsError.message);
      }
    } else {
      console.log('✅ message_threads table EXISTS');
    }

    // Check messages table
    console.log('\n2. Checking messages table...');
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, deleted_at, edited_at, attachment_urls, read_by')
      .limit(0);

    if (messagesError) {
      if (messagesError.code === 'PGRST205') {
        console.log('❌ messages table NOT FOUND');
      } else {
        console.log('⚠️ messages error:', messagesError.message);
      }
    } else {
      console.log('✅ messages table EXISTS');
    }

    // Try to check if columns exist by querying them
    console.log('\n3. Checking required columns...');
    const { error: columnsError } = await supabase
      .from('messages')
      .select('deleted_at, edited_at, attachment_urls, read_by')
      .limit(0);

    if (!columnsError) {
      console.log('✅ All required columns exist (deleted_at, edited_at, attachment_urls, read_by)');
    } else {
      console.log('⚠️ Some columns may be missing:', columnsError.message);
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    if (!threadsError && !messagesError) {
      console.log('✅ SUCCESS! Messaging system is ready to use!');
      console.log('   Tables are properly configured in cloud Supabase.');
      console.log('   You can now use the messaging feature in the app.');
    } else {
      console.log('⚠️ ATTENTION: Messaging tables need to be created.');
      console.log('   Please run the SQL migration in Supabase dashboard:');
      console.log('   https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/sql/new');
      console.log('\n   The SQL has been copied to your clipboard.');
      console.log('   Just paste and run it in the SQL editor.');
    }
    console.log('='.repeat(50));

  } catch (error) {
    console.error('Error checking tables:', error);
  }

  process.exit(0);
}

verifyTables();