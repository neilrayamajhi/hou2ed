const { createClient } = require('@supabase/supabase-js');

// Get environment variables
const supabaseUrl = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('=== Checking Supabase Database Tables ===\n');

  try {
    // Check for messaging tables
    console.log('1. Checking for messaging tables...');

    // Check message_threads table
    const { data: messageThreads, error: messageThreadsError } = await supabase
      .from('message_threads')
      .select('*')
      .limit(0);

    if (messageThreadsError) {
      if (messageThreadsError.code === '42P01') {
        console.log('❌ message_threads table NOT found');
      } else {
        console.log('⚠️ message_threads table error:', messageThreadsError.message);
      }
    } else {
      console.log('✅ message_threads table exists');
    }

    // Check threads table (legacy)
    const { data: threads, error: threadsError } = await supabase
      .from('threads')
      .select('*')
      .limit(0);

    if (threadsError) {
      if (threadsError.code === '42P01') {
        console.log('❌ threads table NOT found');
      } else {
        console.log('⚠️ threads table error:', threadsError.message);
      }
    } else {
      console.log('✅ threads table exists (legacy)');
    }

    // Check messages table
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .limit(0);

    if (messagesError) {
      if (messagesError.code === '42P01') {
        console.log('❌ messages table NOT found');
      } else {
        console.log('⚠️ messages table error:', messagesError.message);
      }
    } else {
      console.log('✅ messages table exists');
    }

    // Check profiles table
    console.log('\n2. Checking for profiles table...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(0);

    if (profilesError) {
      console.log('❌ profiles table error:', profilesError.message);
    } else {
      console.log('✅ profiles table exists');
    }

    // List all tables using raw SQL
    console.log('\n3. Listing all available tables...');
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_tables', {});

    if (tablesError) {
      // Try alternative approach - query a known table
      console.log('Could not list tables directly, checking known tables...');

      const knownTables = [
        'profiles',
        'listings',
        'applications',
        'messages',
        'threads',
        'message_threads',
        'saved_listings'
      ];

      for (const table of knownTables) {
        const { error } = await supabase.from(table).select('*').limit(0);
        if (!error) {
          console.log(`  - ${table} ✅`);
        } else if (error.code === '42P01') {
          console.log(`  - ${table} ❌ (not found)`);
        } else {
          console.log(`  - ${table} ⚠️ (${error.message})`);
        }
      }
    } else {
      console.log('Tables found:', tables);
    }

    // Check if we need to run migrations
    console.log('\n=== Migration Status ===');
    if (messageThreadsError?.code === '42P01' && !threadsError) {
      console.log('⚠️ Need to rename: threads -> message_threads');
    }

    if (!messagesError) {
      // Check for deleted_at column
      const { data: messageColumns, error: columnsError } = await supabase
        .from('messages')
        .select('deleted_at')
        .limit(0);

      if (columnsError && columnsError.message.includes('column')) {
        console.log('⚠️ Need to add: deleted_at column to messages table');
      }
    }

    console.log('\n=== Summary ===');
    console.log('Your Supabase connection is working!');
    console.log('Project URL:', supabaseUrl);
    console.log('Project Ref: rixiofltzptwaiwxhhlf');

  } catch (error) {
    console.error('Error checking tables:', error);
  }
}

checkTables();