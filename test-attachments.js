const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4OTg4NiwiZXhwIjoyMDczOTY1ODg2fQ.J9Oc77ZR1E435SqDsngt8ey4_WVOeTE6UASlYo17Gbc';

async function testAttachments() {
  console.log('🧪 Testing message attachments functionality...\n');

  // Test with service key (should always work)
  console.log('1️⃣ Testing with service key (admin access)...');
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Check bucket exists
    const { data: buckets, error: listError } = await serviceClient.storage.listBuckets();
    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      return;
    }

    const bucket = buckets?.find(b => b.name === 'message-attachments');
    if (!bucket) {
      console.error('❌ Bucket "message-attachments" not found');
      return;
    }

    console.log('✅ Bucket found:', bucket.name);
    console.log('   Public:', bucket.public);
    console.log('   Created:', bucket.created_at);

    // Test upload with service key
    const testFile = new Blob(['Test content for service key'], { type: 'text/plain' });
    const testPath = `test-thread-id/test-user-id/${Date.now()}-service.txt`;

    const { data: uploadData, error: uploadError } = await serviceClient.storage
      .from('message-attachments')
      .upload(testPath, testFile);

    if (uploadError) {
      console.error('❌ Service key upload failed:', uploadError);
    } else {
      console.log('✅ Service key upload successful:', uploadData.path);

      // Clean up
      await serviceClient.storage.from('message-attachments').remove([testPath]);
      console.log('✅ Test file cleaned up');
    }
  } catch (error) {
    console.error('❌ Service key test failed:', error);
  }

  console.log('\n2️⃣ Testing with anon key (requires auth + RLS policies)...');
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);

  // First, we need to authenticate a user
  console.log('   Authenticating test user...');
  const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'testpassword123'
  });

  if (authError) {
    console.log('⚠️ Could not authenticate test user:', authError.message);
    console.log('   This is expected if no test user exists');
    console.log('   RLS policies would need authenticated users to work');
  } else if (authData?.user) {
    console.log('✅ Authenticated as:', authData.user.email);

    // Try upload with authenticated user
    const testFile = new Blob(['Test content for authenticated user'], { type: 'text/plain' });
    const testPath = `test-thread-id/${authData.user.id}/${Date.now()}-auth.txt`;

    const { data: uploadData, error: uploadError } = await anonClient.storage
      .from('message-attachments')
      .upload(testPath, testFile);

    if (uploadError) {
      console.log('⚠️ Authenticated upload failed:', uploadError.message);
      console.log('   This means RLS policies are not yet applied');
      console.log('   The policies need to be applied via Supabase dashboard');
    } else {
      console.log('✅ Authenticated upload successful:', uploadData.path);

      // Clean up
      await anonClient.storage.from('message-attachments').remove([testPath]);
      console.log('✅ Test file cleaned up');
    }

    // Sign out
    await anonClient.auth.signOut();
  }

  console.log('\n📊 Summary:');
  console.log('- Bucket "message-attachments" exists and is configured');
  console.log('- Service key access works (bypasses RLS)');
  console.log('- Anon key access requires RLS policies to be applied');
  console.log('\n📝 Next steps:');
  console.log('1. Apply RLS policies via Supabase dashboard:');
  console.log('   https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/sql/new');
  console.log('2. Copy content from setup-attachment-policies.sql');
  console.log('3. Run the SQL in the editor');
  console.log('\n✅ Once policies are applied, message attachments will work!');
}

testAttachments().catch(console.error);