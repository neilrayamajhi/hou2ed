// End-to-end test for document upload and viewing
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuration
const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testEndToEnd() {
  console.log('🔧 TESTING DOCUMENT UPLOAD END-TO-END');
  console.log('='.repeat(60));

  try {
    // 1. Authenticate as a test user (seeker)
    console.log('\n1️⃣ AUTHENTICATING AS TEST USER...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'y42953@student.ghctk12.com',
      password: 'lllsss'  // You'll need to use correct password
    });

    if (authError) {
      console.error('❌ Authentication failed:', authError.message);
      console.log('Please update the test with correct credentials');
      return;
    }

    console.log('✅ Authenticated as:', authData.user.email);
    console.log('   User ID:', authData.user.id);
    console.log('   Role:', authData.user.user_metadata?.role || 'unknown');

    // 2. Check if user has any applications
    console.log('\n2️⃣ CHECKING USER APPLICATIONS...');
    const { data: applications, error: appError } = await supabase
      .from('applications')
      .select('id, listing_id, status, created_at')
      .eq('seeker_id', authData.user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1);

    if (appError) {
      console.error('❌ Error fetching applications:', appError.message);
      return;
    }

    if (!applications || applications.length === 0) {
      console.log('❌ No applications found for this user');
      console.log('   Please submit an application first through the app');
      return;
    }

    const application = applications[0];
    console.log('✅ Found application:', application.id);
    console.log('   Listing ID:', application.listing_id);
    console.log('   Status:', application.status);
    console.log('   Created:', new Date(application.created_at).toLocaleString());

    // 3. Test document upload to storage
    console.log('\n3️⃣ TESTING DOCUMENT UPLOAD...');
    const testContent = new Blob(['This is a test document created at ' + new Date().toISOString()], {
      type: 'text/plain'
    });
    const fileName = `test_document_${Date.now()}.txt`;
    const filePath = `${application.id}/${fileName}`;

    console.log('   Uploading to path:', filePath);
    console.log('   Content size:', testContent.size, 'bytes');

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('application-documents')
      .upload(filePath, testContent, {
        contentType: 'text/plain',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Upload failed:', uploadError.message);
      if (uploadError.message.includes('row-level security')) {
        console.log('   RLS Policy Issue: User cannot upload to this bucket');
        console.log('   Make sure RLS policies allow authenticated users to upload');
      }
      return;
    }

    console.log('✅ Document uploaded successfully!');
    console.log('   Storage path:', uploadData.path);
    console.log('   ID:', uploadData.id);

    // 4. Save document reference in database
    console.log('\n4️⃣ SAVING DOCUMENT REFERENCE...');
    const { data: docData, error: docError } = await supabase
      .from('documents')
      .insert({
        application_id: application.id,
        type: 'test_document',
        file_path: filePath,
        file_name: fileName,
        file_size: testContent.size,
        status: 'uploaded',
        uploaded_by: authData.user.id
      })
      .select()
      .single();

    if (docError) {
      console.error('❌ Failed to save document reference:', docError.message);
      return;
    }

    console.log('✅ Document reference saved');
    console.log('   Document ID:', docData.id);

    // 5. Verify document can be accessed
    console.log('\n5️⃣ VERIFYING DOCUMENT ACCESS...');

    // Get signed URL for the document
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('application-documents')
      .createSignedUrl(filePath, 3600);

    if (signedUrlError) {
      console.error('❌ Failed to get signed URL:', signedUrlError.message);
      return;
    }

    console.log('✅ Signed URL generated successfully');
    console.log('   URL:', signedUrlData.signedUrl.substring(0, 100) + '...');

    // Try to download the document
    console.log('\n6️⃣ TESTING DOCUMENT DOWNLOAD...');
    const downloadResponse = await fetch(signedUrlData.signedUrl);
    if (downloadResponse.ok) {
      const content = await downloadResponse.text();
      console.log('✅ Document downloaded successfully');
      console.log('   Content preview:', content.substring(0, 50) + '...');
    } else {
      console.error('❌ Failed to download document:', downloadResponse.status, downloadResponse.statusText);
    }

    // 7. Check if provider can access the document
    console.log('\n7️⃣ CHECKING PROVIDER ACCESS...');
    console.log('   Note: Provider access needs to be tested with a provider account');
    console.log('   The provider should be able to see documents for applications to their listings');

    // 8. List all documents for the application
    console.log('\n8️⃣ LISTING ALL DOCUMENTS FOR APPLICATION...');
    const { data: allDocs, error: listError } = await supabase
      .from('documents')
      .select('*')
      .eq('application_id', application.id)
      .order('created_at', { ascending: false });

    if (listError) {
      console.error('❌ Failed to list documents:', listError.message);
    } else {
      console.log(`✅ Found ${allDocs.length} documents for this application:`);
      allDocs.forEach((doc, idx) => {
        console.log(`\n   ${idx + 1}. Document Type: ${doc.type}`);
        console.log(`      File: ${doc.file_name}`);
        console.log(`      Path: ${doc.file_path || 'No path'}`);
        console.log(`      Status: ${doc.status || 'unknown'}`);
        console.log(`      Created: ${new Date(doc.created_at).toLocaleString()}`);
      });
    }

    // 9. Check storage bucket contents
    console.log('\n9️⃣ CHECKING STORAGE BUCKET...');
    const { data: storageFiles, error: storageError } = await supabase.storage
      .from('application-documents')
      .list(application.id, {
        limit: 10
      });

    if (storageError) {
      console.error('❌ Failed to list storage files:', storageError.message);
    } else if (storageFiles && storageFiles.length > 0) {
      console.log(`✅ Found ${storageFiles.length} files in storage for this application:`);
      storageFiles.forEach((file, idx) => {
        console.log(`   ${idx + 1}. ${file.name} (${file.metadata?.size || 'Unknown'} bytes)`);
      });
    } else {
      console.log('⚠️ No files found in storage for this application');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  } finally {
    // Sign out
    await supabase.auth.signOut();
    console.log('\n✅ Test complete - signed out');
  }

  console.log('\n' + '='.repeat(60));
  console.log('📋 SUMMARY:');
  console.log('• Authentication: Working with anon key');
  console.log('• Upload with RLS: Should work for authenticated users');
  console.log('• Document storage: Files are saved with application ID folders');
  console.log('• Signed URLs: Generated for private document access');
  console.log('• Provider access: Controlled by RLS policies');
  console.log('\nIf uploads are failing, check:');
  console.log('1. RLS policies allow authenticated users to upload');
  console.log('2. Application ID exists and belongs to user');
  console.log('3. Storage bucket "application-documents" exists');
}

testEndToEnd().catch(console.error);