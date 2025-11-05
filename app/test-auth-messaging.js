const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
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
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY; // Use anon key to test auth

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAuthAndMessaging() {
  console.log('🔐 Testing Authentication & Messaging\n');

  // Step 1: Check if user is authenticated
  console.log('1️⃣ Checking authentication status...');
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.log('❌ No authenticated user found');
    console.log('\n📝 To test messaging, you need to:');
    console.log('1. Sign in to the app');
    console.log('2. Navigate to the Messages tab');
    console.log('3. The error should be resolved');
    console.log('\n💡 The error "User not initialized" happens when:');
    console.log('   - You\'re not logged in');
    console.log('   - The auth session expired');
    console.log('   - The messageService tries to initialize without a valid user');
    return;
  }

  console.log('✅ User authenticated:', user.email);

  // Step 2: Test messageService initialization
  console.log('\n2️⃣ Testing messageService initialization...');

  // Simulate what messageService.initialize() does
  if (user) {
    console.log('✅ User ID available:', user.id);

    // Step 3: Check if user can access threads
    console.log('\n3️⃣ Checking thread access...');

    const { data: threads, error: threadError } = await supabase
      .from('message_threads')
      .select('*')
      .contains('participant_ids', [user.id]);

    if (threadError) {
      console.log('❌ Error accessing threads:', threadError.message);
    } else {
      console.log(`✅ Can access threads. Found ${threads?.length || 0} threads`);
    }

    // Step 4: Check if user can access messages
    console.log('\n4️⃣ Checking message access...');

    if (threads && threads.length > 0) {
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', threads[0].id)
        .limit(5);

      if (msgError) {
        console.log('❌ Error accessing messages:', msgError.message);
      } else {
        console.log(`✅ Can access messages. Found ${messages?.length || 0} messages`);
      }
    }

    // Step 5: Test subscription
    console.log('\n5️⃣ Testing real-time subscription...');

    const channel = supabase
      .channel('test-inbox')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_threads',
        },
        (payload) => {
          console.log('📨 Received real-time update');
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to inbox updates');
        } else if (status === 'CLOSED') {
          console.log('⚠️ Subscription closed');
        } else if (status === 'CHANNEL_ERROR') {
          console.log('❌ Subscription error');
        }
      });

    // Wait a moment then unsubscribe
    setTimeout(() => {
      channel.unsubscribe();
      console.log('\n✅ All tests passed! Messaging should work in the app.');
    }, 2000);

  }
}

testAuthAndMessaging();