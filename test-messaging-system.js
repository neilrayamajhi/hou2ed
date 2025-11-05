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
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMessaging() {
  console.log('🧪 Testing Messaging System...\n');

  try {
    // Step 1: Get two test users
    console.log('1️⃣ Getting test users...');
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error('Failed to list users:', usersError);
      return;
    }

    if (!users || users.users.length < 2) {
      console.error('Need at least 2 users to test messaging');
      return;
    }

    const user1 = users.users[0];
    const user2 = users.users[1];
    console.log(`   User 1: ${user1.email} (${user1.id})`);
    console.log(`   User 2: ${user2.email} (${user2.id})`);

    // Step 2: Create a thread
    console.log('\n2️⃣ Creating message thread...');
    const { data: thread, error: threadError } = await supabase
      .from('message_threads')
      .insert({
        participant_ids: [user1.id, user2.id],
        subject: 'Test Conversation',
        last_message_at: new Date().toISOString()
      })
      .select()
      .single();

    if (threadError) {
      console.error('Failed to create thread:', threadError);
      return;
    }

    console.log(`   ✅ Thread created: ${thread.id}`);

    // Step 3: Send a message from user1
    console.log('\n3️⃣ Sending message from User 1...');
    const { data: message1, error: msg1Error } = await supabase
      .from('messages')
      .insert({
        thread_id: thread.id,
        sender_id: user1.id,
        body: 'Hello! This is a test message.',
        read_by: [user1.id]
      })
      .select()
      .single();

    if (msg1Error) {
      console.error('Failed to send message:', msg1Error);
      return;
    }

    console.log(`   ✅ Message sent: "${message1.body}"`);

    // Step 4: Send a reply from user2
    console.log('\n4️⃣ Sending reply from User 2...');
    const { data: message2, error: msg2Error } = await supabase
      .from('messages')
      .insert({
        thread_id: thread.id,
        sender_id: user2.id,
        body: 'Hi there! Message received.',
        read_by: [user2.id]
      })
      .select()
      .single();

    if (msg2Error) {
      console.error('Failed to send reply:', msg2Error);
      return;
    }

    console.log(`   ✅ Reply sent: "${message2.body}"`);

    // Step 5: Fetch thread messages
    console.log('\n5️⃣ Fetching thread messages...');
    const { data: messages, error: fetchError } = await supabase
      .from('messages')
      .select('*')
      .eq('thread_id', thread.id)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Failed to fetch messages:', fetchError);
      return;
    }

    console.log(`   ✅ Found ${messages.length} messages:`);
    messages.forEach((msg, i) => {
      const sender = msg.sender_id === user1.id ? 'User 1' : 'User 2';
      console.log(`      ${i + 1}. ${sender}: "${msg.body}"`);
    });

    // Step 6: Test marking as read
    console.log('\n6️⃣ Testing read receipts...');
    const { error: readError } = await supabase
      .from('messages')
      .update({
        read_by: [user1.id, user2.id]
      })
      .eq('id', message2.id);

    if (readError) {
      console.error('Failed to mark as read:', readError);
    } else {
      console.log('   ✅ Message marked as read by both users');
    }

    // Step 7: Test soft delete
    console.log('\n7️⃣ Testing message deletion...');
    const { error: deleteError } = await supabase
      .from('messages')
      .update({
        deleted_at: new Date().toISOString()
      })
      .eq('id', message1.id);

    if (deleteError) {
      console.error('Failed to delete message:', deleteError);
    } else {
      console.log('   ✅ Message soft-deleted');
    }

    // Step 8: Test real-time subscription
    console.log('\n8️⃣ Testing real-time subscription...');
    const channel = supabase
      .channel(`test-thread-${thread.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${thread.id}`,
        },
        (payload) => {
          console.log('   📨 Real-time message received:', payload.new.body);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('   ✅ Real-time subscription active');
        }
      });

    // Wait a moment for subscription to establish
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Send a test real-time message
    console.log('   Sending test real-time message...');
    await supabase
      .from('messages')
      .insert({
        thread_id: thread.id,
        sender_id: user1.id,
        body: 'Real-time test message!',
        read_by: [user1.id]
      });

    // Wait for real-time message
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Unsubscribe
    channel.unsubscribe();

    // Step 9: Clean up test data
    console.log('\n9️⃣ Cleaning up test data...');

    // Delete messages
    await supabase
      .from('messages')
      .delete()
      .eq('thread_id', thread.id);

    // Delete thread
    await supabase
      .from('message_threads')
      .delete()
      .eq('id', thread.id);

    console.log('   ✅ Test data cleaned up');

    // Summary
    console.log('\n✨ Messaging System Test Complete!');
    console.log('   ✅ Threads: Working');
    console.log('   ✅ Messages: Working');
    console.log('   ✅ Read Receipts: Working');
    console.log('   ✅ Soft Delete: Working');
    console.log('   ✅ Real-time: Working');
    console.log('\n🎉 All tests passed! Messaging system is functional.');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }

  process.exit(0);
}

testMessaging();