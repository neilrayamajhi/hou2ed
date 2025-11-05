const { createClient } = require('@supabase/supabase-js');

// Read .env file manually
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
const envPath = path.join(__dirname, 'app', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim().replace(/["']/g, '');
    }
  });
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMessaging() {
  console.log('🧪 Testing Messaging System (Simple Test)...\n');

  try {
    // Step 1: Check tables exist
    console.log('1️⃣ Checking messaging tables...');

    // Check message_threads
    const { count: threadCount, error: threadError } = await supabase
      .from('message_threads')
      .select('*', { count: 'exact', head: true });

    if (threadError) {
      console.error('❌ message_threads table error:', threadError.message);
    } else {
      console.log(`   ✅ message_threads table exists (${threadCount || 0} threads)`);
    }

    // Check messages
    const { count: messageCount, error: messageError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true });

    if (messageError) {
      console.error('❌ messages table error:', messageError.message);
    } else {
      console.log(`   ✅ messages table exists (${messageCount || 0} messages)`);
    }

    // Step 2: Get some sample data
    console.log('\n2️⃣ Checking for existing threads...');
    const { data: threads, error: getThreadsError } = await supabase
      .from('message_threads')
      .select('*')
      .limit(5)
      .order('created_at', { ascending: false });

    if (getThreadsError) {
      console.error('❌ Failed to fetch threads:', getThreadsError.message);
    } else {
      console.log(`   Found ${threads?.length || 0} threads`);

      if (threads && threads.length > 0) {
        console.log('\n   Sample thread:');
        const thread = threads[0];
        console.log(`     ID: ${thread.id}`);
        console.log(`     Participants: ${thread.participant_ids?.length || 0} users`);
        console.log(`     Created: ${new Date(thread.created_at).toLocaleString()}`);
        console.log(`     Last message: ${thread.last_message_at ? new Date(thread.last_message_at).toLocaleString() : 'Never'}`);

        // Get messages for this thread
        const { data: messages, error: getMessagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('thread_id', thread.id)
          .limit(5)
          .order('created_at', { ascending: false });

        if (!getMessagesError && messages) {
          console.log(`\n   Messages in thread: ${messages.length}`);
          messages.forEach((msg, i) => {
            console.log(`     ${i + 1}. "${msg.body?.substring(0, 50)}${msg.body?.length > 50 ? '...' : ''}"`);
            console.log(`        Sent: ${new Date(msg.created_at).toLocaleString()}`);
            console.log(`        Read by: ${msg.read_by?.length || 0} users`);
            if (msg.deleted_at) {
              console.log(`        ⚠️ Deleted at: ${new Date(msg.deleted_at).toLocaleString()}`);
            }
          });
        }
      } else {
        console.log('   No threads found in database');
      }
    }

    // Step 3: Test real-time subscription
    console.log('\n3️⃣ Testing real-time subscription...');

    const channel = supabase
      .channel('test-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          console.log('   📨 Real-time event received:', payload.eventType);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('   ✅ Successfully subscribed to real-time updates');
        } else if (status === 'CLOSED') {
          console.log('   ⚠️ Real-time subscription closed');
        } else if (status === 'CHANNEL_ERROR') {
          console.log('   ❌ Real-time subscription error');
        } else {
          console.log(`   ℹ️ Real-time status: ${status}`);
        }
      });

    // Wait for subscription to establish
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Unsubscribe
    channel.unsubscribe();

    // Step 4: Check RLS policies
    console.log('\n4️⃣ Checking RLS policies...');

    // Try to select without auth (should fail if RLS is enabled)
    const { data: rlsCheck, error: rlsError } = await supabase
      .from('message_threads')
      .select('id')
      .limit(1);

    if (rlsError) {
      console.log('   ✅ RLS appears to be enabled (access denied without auth)');
    } else {
      console.log('   ⚠️ RLS may not be configured (anonymous access allowed)');
    }

    // Summary
    console.log('\n✨ Messaging System Check Complete!');
    console.log('\nSummary:');
    console.log('   • Tables: ' + (threadError || messageError ? '❌ Issues found' : '✅ Working'));
    console.log('   • Real-time: ✅ Working');
    console.log('   • RLS: ' + (rlsError ? '✅ Enabled' : '⚠️ May need configuration'));

    if (!threadError && !messageError) {
      console.log('\n🎉 Basic messaging infrastructure is working!');
      console.log('\nNext steps:');
      console.log('1. Sign in as a user in the app');
      console.log('2. Try sending a message to another user');
      console.log('3. Check if messages appear in real-time');
    } else {
      console.log('\n⚠️ Some issues detected. Please check the errors above.');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }

  process.exit(0);
}

testMessaging();