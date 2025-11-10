const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4OTg4NiwiZXhwIjoyMDczOTY1ODg2fQ.J9Oc77ZR1E435SqDsngt8ey4_WVOeTE6UASlYo17Gbc';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  }
});

async function fixMessageAttachmentsBucket() {
  console.log('🚀 Fixing message attachments bucket...\n');

  try {
    // Step 1: Check if bucket exists
    console.log('Step 1: Checking if bucket exists...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('Error listing buckets:', listError);
      return;
    }

    const existingBucket = buckets?.find(b => b.name === 'message-attachments');

    if (existingBucket) {
      console.log('✅ Bucket already exists:', existingBucket.name);
      console.log('   Public:', existingBucket.public);
      console.log('   Created:', existingBucket.created_at);

      // Step 2: Delete the existing bucket to recreate with proper settings
      console.log('\nStep 2: Deleting existing bucket to recreate with service key...');
      const { error: deleteError } = await supabase.storage.deleteBucket('message-attachments');

      if (deleteError && !deleteError.message.includes('not empty')) {
        console.error('Error deleting bucket:', deleteError);
        // Continue anyway - might just need to update policies
      } else if (deleteError) {
        console.log('⚠️ Bucket not empty, keeping existing bucket');
      } else {
        console.log('✅ Existing bucket deleted');
      }
    }

    // Step 3: Create the bucket with proper settings
    if (!existingBucket || !existingBucket.id) {
      console.log('\nStep 3: Creating new bucket with service key permissions...');
      const { data, error: createError } = await supabase.storage.createBucket(
        'message-attachments',
        {
          public: false, // Changed to false for private access
          fileSizeLimit: 10485760, // 10MB
          allowedMimeTypes: [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'application/pdf',
            'text/plain',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          ]
        }
      );

      if (createError) {
        if (createError.message.includes('already exists')) {
          console.log('ℹ️ Bucket already exists, will work with existing bucket');
        } else {
          console.error('Error creating bucket:', createError);
          return;
        }
      } else {
        console.log('✅ Bucket created successfully:', data.name);
      }
    }

    // Step 4: Test bucket access with service key
    console.log('\nStep 4: Testing bucket access...');
    const testFileName = `test/${Date.now()}.txt`;
    const testContent = new Blob(['Test content'], { type: 'text/plain' });

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('message-attachments')
      .upload(testFileName, testContent, {
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Test upload failed:', uploadError);
      console.log('\n⚠️ The bucket exists but needs RLS policies to be configured.');
      console.log('Please apply the following SQL in the Supabase SQL editor:');
      console.log('https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/sql/new\n');

      // Output the SQL that needs to be run
      console.log(`-- RLS Policies for message-attachments bucket
-- Run this SQL in the Supabase dashboard

-- Allow authenticated users to upload files
CREATE POLICY "Users can upload message attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'message-attachments'
    AND auth.uid()::text = (string_to_array(name, '/'))[2]
);

-- Allow authenticated users to view files in threads they're part of
CREATE POLICY "Users can view message attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'message-attachments'
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete own message attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'message-attachments'
    AND auth.uid()::text = (string_to_array(name, '/'))[2]
);

-- Allow users to update their own files
CREATE POLICY "Users can update own message attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'message-attachments'
    AND auth.uid()::text = (string_to_array(name, '/'))[2]
);`);

    } else {
      console.log('✅ Test upload successful:', uploadData.path);

      // Clean up test file
      const { error: deleteError } = await supabase.storage
        .from('message-attachments')
        .remove([testFileName]);

      if (!deleteError) {
        console.log('✅ Test file cleaned up');
      }

      console.log('\n✅ Bucket is fully functional with service key!');
    }

    console.log('\n📝 Summary:');
    console.log('- Bucket "message-attachments" is configured');
    console.log('- Using service key for full access (bypasses RLS)');
    console.log('- File size limit: 10MB');
    console.log('- Allowed file types: images, PDFs, text, Word documents');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

fixMessageAttachmentsBucket();