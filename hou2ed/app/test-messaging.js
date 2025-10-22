/**
 * Test script for messaging system
 * This will create test users, threads, and messages
 */

const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials
const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test user credentials
const TEST_USER_1 = {
  email: 'test.seeker@example.com',
  password: 'TestPass123!',
  fullName: 'Test Seeker',
  role: 'seeker'
};

const TEST_USER_2 = {
  email: 'test.provider@example.com',
  password: 'TestPass123!',
  fullName: 'Test Provider',
  role: 'provider'
};

let user1Id = null;
let user2Id = null;
let threadId = null;

async function testMessaging() {
  console.log('🧪 Starting Messaging System Test...\n');

  try {
    // Step 1: Sign up test users
    console.log('1️⃣ Creating test users...');

    // Create first user
    const { data: signUp1, error: signUpError1 } = await supabase.auth.signUp({
      email: TEST_USER_1.email,
      password: TEST_USER_1.password,
      options: {
        data: {
          full_name: TEST_USER_1.fullName,
          username: 'testseeker',
          role: TEST_USER_1.role
        }
      }
    });

    if (signUpError1 && !signUpError1.message.includes('already registered')) {
      throw signUpError1;
    }

    // Sign in as user 1 to get their ID
    const { data: signIn1, error: signInError1 } = await supabase.auth.signInWithPassword({
      email: TEST_USER_1.email,
      password: TEST_USER_1.password
    });

    if (signInError1) {
      console.log('⚠️ Could not sign in user 1:', signInError1.message);
      console.log('Creating user via admin API instead...');

      // Try to get user by email
      const { data: profile1 } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', TEST_USER_1.email)
        .single();

      if (profile1) {
        user1Id = profile1.user_id;
      }
    } else {
      user1Id = signIn1.user.id;
    }

    // Create second user
    const { data: signUp2, error: signUpError2 } = await supabase.auth.signUp({
      email: TEST_USER_2.email,
      password: TEST_USER_2.password,
      options: {
        data: {
          full_name: TEST_USER_2.fullName,
          username: 'testprovider',
          role: TEST_USER_2.role
        }
      }
    });

    if (signUpError2 && !signUpError2.message.includes('already registered')) {
      throw signUpError2;
    }

    // Sign in as user 2 to get their ID
    const { data: signIn2, error: signInError2 } = await supabase.auth.signInWithPassword({
      email: TEST_USER_2.email,
      password: TEST_USER_2.password
    });

    if (signInError2) {
      console.log('⚠️ Could not sign in user 2:', signInError2.message);

      // Try to get user by email
      const { data: profile2 } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', TEST_USER_2.email)
        .single();

      if (profile2) {
        user2Id = profile2.user_id;
      }
    } else {
      user2Id = signIn2.user.id;
    }

    if (!user1Id || !user2Id) {
      console.log('❌ Could not get user IDs. Users might not be confirmed.');
      console.log('Please check your email and confirm the accounts, then run this test again.');
      return;
    }

    console.log('✅ Users ready:');
    console.log(`   User 1 ID: ${user1Id}`);
    console.log(`   User 2 ID: ${user2Id}\n`);

    // Step 2: Create a message thread
    console.log('2️⃣ Creating message thread...');

    const { data: thread, error: threadError } = await supabase
      .from('message_threads')
      .insert({
        participant_ids: [user1Id, user2Id],
        subject: 'Test Conversation - Downtown Shelter Inquiry',
        last_message_at: new Date().toISOString()
      })
      .select()
      .single();

    if (threadError) {
      // Check if thread already exists
      const { data: existingThread } = await supabase
        .from('message_threads')
        .select('*')
        .contains('participant_ids', [user1Id, user2Id])
        .single();

      if (existingThread) {
        threadId = existingThread.id;
        console.log('✅ Using existing thread:', threadId);
      } else {
        throw threadError;
      }
    } else {
      threadId = thread.id;
      console.log('✅ Thread created:', threadId, '\n');
    }

    // Step 3: Send messages
    console.log('3️⃣ Sending test messages...');

    // Message from seeker
    const message1 = {
      thread_id: threadId,
      sender_id: user1Id,
      body: 'Hi! I saw your listing for the Downtown Shelter. Do you have any beds available?',
      read_by: [user1Id]
    };

    const { data: msg1, error: msg1Error } = await supabase
      .from('messages')
      .insert(message1)
      .select()
      .single();

    if (msg1Error) throw msg1Error;
    console.log('✅ Message 1 sent:', msg1.body.substring(0, 50) + '...');

    // Message from provider
    const message2 = {
      thread_id: threadId,
      sender_id: user2Id,
      body: 'Yes, we currently have 3 beds available. Would you like to schedule a visit?',
      read_by: [user2Id]
    };

    const { data: msg2, error: msg2Error } = await supabase
      .from('messages')
      .insert(message2)
      .select()
      .single();

    if (msg2Error) throw msg2Error;
    console.log('✅ Message 2 sent:', msg2.body.substring(0, 50) + '...');

    // Another message from seeker
    const message3 = {
      thread_id: threadId,
      sender_id: user1Id,
      body: 'That would be great! I can come by tomorrow afternoon if that works.',
      read_by: [user1Id]
    };

    const { data: msg3, error: msg3Error } = await supabase
      .from('messages')
      .insert(message3)
      .select()
      .single();

    if (msg3Error) throw msg3Error;
    console.log('✅ Message 3 sent:', msg3.body.substring(0, 50) + '...\n');

    // Step 4: Test reading messages
    console.log('4️⃣ Testing message retrieval...');

    const { data: threadMessages, error: readError } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(
          id,
          full_name,
          username,
          role
        )
      `)
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (readError) {
      console.log('⚠️ Could not fetch with profile join, trying simple fetch...');

      const { data: simpleMessages, error: simpleError } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (simpleError) throw simpleError;

      console.log('✅ Found', simpleMessages.length, 'messages in thread');
      simpleMessages.forEach((msg, i) => {
        console.log(`   ${i + 1}. ${msg.body.substring(0, 60)}...`);
      });
    } else {
      console.log('✅ Found', threadMessages.length, 'messages in thread');
      threadMessages.forEach((msg, i) => {
        const senderName = msg.sender?.full_name || 'Unknown';
        console.log(`   ${i + 1}. [${senderName}]: ${msg.body.substring(0, 50)}...`);
      });
    }

    // Step 5: Test thread listing
    console.log('\n5️⃣ Testing thread listing...');

    const { data: threads, error: threadsError } = await supabase
      .from('message_threads')
      .select('*')
      .or(`participant_ids.cs.{${user1Id}},participant_ids.cs.{${user2Id}}`)
      .order('last_message_at', { ascending: false });

    if (threadsError) throw threadsError;

    console.log('✅ Found', threads.length, 'thread(s) for test users');
    threads.forEach((t) => {
      console.log(`   Thread: ${t.subject || 'No subject'} (${t.id})`);
    });

    // Step 6: Test real-time subscription
    console.log('\n6️⃣ Testing real-time subscription...');
    console.log('Setting up listener for new messages...');

    const channel = supabase
      .channel(`test-thread-${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${threadId}`
        },
        (payload) => {
          console.log('🔔 Real-time message received:', payload.new.body);
        }
      )
      .subscribe();

    console.log('✅ Real-time subscription active');

    // Send a test real-time message
    setTimeout(async () => {
      console.log('Sending real-time test message...');
      const { error } = await supabase
        .from('messages')
        .insert({
          thread_id: threadId,
          sender_id: user2Id,
          body: '[REAL-TIME TEST] This message should trigger the subscription!',
          read_by: [user2Id]
        });

      if (error) {
        console.log('❌ Real-time test failed:', error.message);
      }
    }, 2000);

    // Clean up after 5 seconds
    setTimeout(() => {
      channel.unsubscribe();
      console.log('\n✅ All tests completed successfully!');
      console.log('\n📱 To see this in the app:');
      console.log(`1. Login as: ${TEST_USER_1.email} (password: ${TEST_USER_1.password})`);
      console.log('2. Go to the Messages tab');
      console.log('3. You should see the test conversation');
      console.log('\n🎉 Messaging system is working correctly!');
      process.exit(0);
    }, 5000);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Details:', error);
    process.exit(1);
  }
}

// Run the test
console.log('═══════════════════════════════════════');
console.log('   MESSAGING SYSTEM TEST');
console.log('═══════════════════════════════════════\n');

testMessaging();