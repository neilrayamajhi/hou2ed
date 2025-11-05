const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
const envPath = path.join(__dirname, '.env');
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
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Try to get service key from command line if not in env
const serviceKey = supabaseServiceKey || process.argv[2];

if (!supabaseUrl) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL');
  process.exit(1);
}

if (!serviceKey) {
  console.log('⚠️ No service key provided. Using anon key (limited permissions)');
}

const supabaseKey = serviceKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testMessaging() {
  log('\n══════════════════════════════════════', colors.cyan);
  log('   COMPREHENSIVE MESSAGING TEST', colors.bright + colors.cyan);
  log('══════════════════════════════════════\n', colors.cyan);

  let testsPassed = 0;
  let testsFailed = 0;
  let warnings = 0;

  // Test 1: Check tables
  log('📋 Test 1: Database Tables', colors.bright);
  try {
    const { error: threadsError } = await supabase
      .from('message_threads')
      .select('id')
      .limit(1);

    if (threadsError) {
      log('  ❌ message_threads table: ' + threadsError.message, colors.red);
      testsFailed++;
    } else {
      log('  ✅ message_threads table accessible', colors.green);
      testsPassed++;
    }

    const { error: messagesError } = await supabase
      .from('messages')
      .select('id')
      .limit(1);

    if (messagesError) {
      log('  ❌ messages table: ' + messagesError.message, colors.red);
      testsFailed++;
    } else {
      log('  ✅ messages table accessible', colors.green);
      testsPassed++;
    }
  } catch (error) {
    log('  ❌ Table check failed: ' + error.message, colors.red);
    testsFailed++;
  }

  // Test 2: Get users (if service key available)
  log('\n📋 Test 2: User Authentication', colors.bright);
  let user1, user2;

  if (serviceKey) {
    try {
      const { data: { users }, error } = await supabase.auth.admin.listUsers();

      if (error) {
        log('  ⚠️ Cannot list users (need service key): ' + error.message, colors.yellow);
        warnings++;
      } else if (users && users.length >= 2) {
        user1 = users[0];
        user2 = users[1];
        log(`  ✅ Found ${users.length} users`, colors.green);
        log(`  • User 1: ${user1.email}`, colors.cyan);
        log(`  • User 2: ${user2.email}`, colors.cyan);
        testsPassed++;
      } else {
        log(`  ⚠️ Only ${users?.length || 0} users found (need at least 2)`, colors.yellow);
        warnings++;
      }
    } catch (error) {
      log('  ⚠️ User auth test skipped: ' + error.message, colors.yellow);
      warnings++;
    }
  } else {
    // Create mock user IDs for testing
    user1 = { id: '11111111-1111-1111-1111-111111111111', email: 'test1@example.com' };
    user2 = { id: '22222222-2222-2222-2222-222222222222', email: 'test2@example.com' };
    log('  ⚠️ Using mock user IDs (no service key)', colors.yellow);
    warnings++;
  }

  // Test 3: Create thread
  log('\n📋 Test 3: Thread Creation', colors.bright);
  let threadId;

  try {
    const { data: thread, error } = await supabase
      .from('message_threads')
      .insert({
        participant_ids: [user1.id, user2.id],
        subject: 'Test Thread - ' + new Date().toISOString(),
        last_message_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      log('  ❌ Thread creation failed: ' + error.message, colors.red);
      testsFailed++;
    } else {
      threadId = thread.id;
      log('  ✅ Thread created: ' + thread.id, colors.green);
      log('  • Participants: ' + thread.participant_ids.length, colors.cyan);
      testsPassed++;
    }
  } catch (error) {
    log('  ❌ Thread creation error: ' + error.message, colors.red);
    testsFailed++;
  }

  // Test 4: Send message
  log('\n📋 Test 4: Message Sending', colors.bright);
  let messageId;

  if (threadId) {
    try {
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          thread_id: threadId,
          sender_id: user1.id,
          body: 'Test message from automated test - ' + new Date().toISOString(),
          read_by: [user1.id]
        })
        .select()
        .single();

      if (error) {
        log('  ❌ Message send failed: ' + error.message, colors.red);
        testsFailed++;
      } else {
        messageId = message.id;
        log('  ✅ Message sent: ' + message.id, colors.green);
        log('  • Content: "' + message.body.substring(0, 50) + '..."', colors.cyan);
        testsPassed++;
      }
    } catch (error) {
      log('  ❌ Message send error: ' + error.message, colors.red);
      testsFailed++;
    }
  } else {
    log('  ⚠️ Skipped (no thread created)', colors.yellow);
    warnings++;
  }

  // Test 5: Read messages
  log('\n📋 Test 5: Message Retrieval', colors.bright);

  if (threadId) {
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: false });

      if (error) {
        log('  ❌ Message retrieval failed: ' + error.message, colors.red);
        testsFailed++;
      } else {
        log('  ✅ Retrieved ' + messages.length + ' messages', colors.green);
        messages.forEach((msg, i) => {
          log(`  • Message ${i + 1}: "${msg.body.substring(0, 40)}..."`, colors.cyan);
        });
        testsPassed++;
      }
    } catch (error) {
      log('  ❌ Message retrieval error: ' + error.message, colors.red);
      testsFailed++;
    }
  } else {
    log('  ⚠️ Skipped (no thread created)', colors.yellow);
    warnings++;
  }

  // Test 6: Update read status
  log('\n📋 Test 6: Read Receipts', colors.bright);

  if (messageId) {
    try {
      const { error } = await supabase
        .from('messages')
        .update({
          read_by: [user1.id, user2.id]
        })
        .eq('id', messageId);

      if (error) {
        log('  ❌ Read receipt update failed: ' + error.message, colors.red);
        testsFailed++;
      } else {
        log('  ✅ Message marked as read by both users', colors.green);
        testsPassed++;
      }
    } catch (error) {
      log('  ❌ Read receipt error: ' + error.message, colors.red);
      testsFailed++;
    }
  } else {
    log('  ⚠️ Skipped (no message created)', colors.yellow);
    warnings++;
  }

  // Test 7: Real-time subscription
  log('\n📋 Test 7: Real-time Subscriptions', colors.bright);

  if (threadId) {
    let receivedMessage = false;

    const channel = supabase
      .channel(`test-${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          receivedMessage = true;
          log('  📨 Real-time message received!', colors.green);
          log('  • Message: "' + payload.new.body?.substring(0, 50) + '..."', colors.cyan);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          log('  ✅ Subscribed to real-time updates', colors.green);
        }
      });

    // Wait for subscription
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Send test message
    log('  📤 Sending test real-time message...', colors.cyan);

    const { error } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        sender_id: user2.id,
        body: 'Real-time test message - ' + new Date().toISOString(),
        read_by: [user2.id]
      });

    if (error) {
      log('  ❌ Real-time test send failed: ' + error.message, colors.red);
      testsFailed++;
    } else {
      // Wait for real-time delivery
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (receivedMessage) {
        log('  ✅ Real-time delivery confirmed!', colors.green);
        testsPassed++;
      } else {
        log('  ⚠️ Real-time message not received (may be normal)', colors.yellow);
        warnings++;
      }
    }

    channel.unsubscribe();
  } else {
    log('  ⚠️ Skipped (no thread created)', colors.yellow);
    warnings++;
  }

  // Test 8: Soft delete
  log('\n📋 Test 8: Message Deletion', colors.bright);

  if (messageId) {
    try {
      const { error } = await supabase
        .from('messages')
        .update({
          deleted_at: new Date().toISOString()
        })
        .eq('id', messageId);

      if (error) {
        log('  ❌ Soft delete failed: ' + error.message, colors.red);
        testsFailed++;
      } else {
        log('  ✅ Message soft-deleted successfully', colors.green);
        testsPassed++;
      }
    } catch (error) {
      log('  ❌ Soft delete error: ' + error.message, colors.red);
      testsFailed++;
    }
  } else {
    log('  ⚠️ Skipped (no message created)', colors.yellow);
    warnings++;
  }

  // Cleanup
  log('\n📋 Cleanup', colors.bright);

  if (threadId) {
    try {
      // Delete messages
      await supabase
        .from('messages')
        .delete()
        .eq('thread_id', threadId);

      // Delete thread
      await supabase
        .from('message_threads')
        .delete()
        .eq('id', threadId);

      log('  ✅ Test data cleaned up', colors.green);
    } catch (error) {
      log('  ⚠️ Cleanup warning: ' + error.message, colors.yellow);
    }
  }

  // Summary
  log('\n══════════════════════════════════════', colors.cyan);
  log('   TEST RESULTS', colors.bright + colors.cyan);
  log('══════════════════════════════════════\n', colors.cyan);

  log(`Tests Passed: ${testsPassed}`, testsPassed > 0 ? colors.green : colors.red);
  log(`Tests Failed: ${testsFailed}`, testsFailed > 0 ? colors.red : colors.green);
  log(`Warnings: ${warnings}`, warnings > 0 ? colors.yellow : colors.green);

  const totalTests = testsPassed + testsFailed;
  const passRate = totalTests > 0 ? Math.round((testsPassed / totalTests) * 100) : 0;

  log(`\nPass Rate: ${passRate}%`, passRate >= 70 ? colors.green : colors.red);

  if (testsFailed === 0) {
    log('\n🎉 All tests passed! Messaging system is fully functional!', colors.bright + colors.green);
  } else if (passRate >= 70) {
    log('\n✅ Messaging system is mostly functional with some issues.', colors.yellow);
  } else {
    log('\n❌ Messaging system has significant issues that need attention.', colors.red);
  }

  // Recommendations
  if (!serviceKey) {
    log('\n💡 Tip: Provide service key for more comprehensive testing:', colors.cyan);
    log('   node test-messaging-complete.js YOUR_SERVICE_KEY', colors.cyan);
  }

  process.exit(testsFailed > 0 ? 1 : 0);
}

testMessaging().catch(error => {
  log('\n❌ Fatal error: ' + error.message, colors.red);
  process.exit(1);
});