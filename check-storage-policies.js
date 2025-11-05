const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service key for admin access
const supabase = createClient(
  'https://rixiofltzptwaiwxhhlf.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4OTg4NiwiZXhwIjoyMDczOTY1ODg2fQ.J9Oc77ZR1E435SqDsngt8ey4_WVOeTE6UASlYo17Gbc'
);

async function checkStoragePolicies() {
  console.log('🔍 Checking storage buckets and policies...\n');

  try {
    // List all buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError);
      return;
    }

    console.log(`📦 Found ${buckets.length} storage bucket(s):\n`);

    for (const bucket of buckets) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📦 Bucket: ${bucket.name}`);
      console.log(`   ID: ${bucket.id}`);
      console.log(`   Public: ${bucket.public ? '✅ Yes' : '❌ No'}`);
      console.log(`   Created: ${new Date(bucket.created_at).toLocaleString()}`);
      console.log(`   File size limit: ${bucket.file_size_limit ? (bucket.file_size_limit / 1024 / 1024) + 'MB' : 'None'}`);
      console.log(`   Allowed MIME types: ${bucket.allowed_mime_types?.join(', ') || 'All'}`);

      // Test upload permissions
      console.log('\n   🧪 Testing upload permissions...');
      const testFileName = `test-${Date.now()}.txt`;
      const testContent = 'Test upload';

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket.name)
        .upload(testFileName, testContent, {
          contentType: 'text/plain',
          upsert: false
        });

      if (uploadError) {
        console.log(`   ❌ Upload test failed: ${uploadError.message}`);
        if (uploadError.message.includes('row-level security')) {
          console.log('   ⚠️ RLS policies might be blocking uploads');
        }
      } else {
        console.log('   ✅ Upload test successful');

        // Test if file is publicly accessible
        const { data: { publicUrl } } = supabase.storage
          .from(bucket.name)
          .getPublicUrl(testFileName);

        console.log(`   🔗 Public URL: ${publicUrl}`);

        // Test fetching the file
        try {
          const response = await fetch(publicUrl);
          if (response.ok) {
            console.log('   ✅ File is publicly accessible');
          } else {
            console.log(`   ❌ File is not publicly accessible (HTTP ${response.status})`);
          }
        } catch (fetchError) {
          console.log('   ⚠️ Could not test public access');
        }

        // Clean up test file
        const { error: deleteError } = await supabase.storage
          .from(bucket.name)
          .remove([testFileName]);

        if (deleteError) {
          console.log(`   ⚠️ Could not clean up test file: ${deleteError.message}`);
        } else {
          console.log('   🗑️ Test file cleaned up');
        }
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📊 Storage Configuration Recommendations:\n');

    // Check for listing-images bucket
    const listingImagesBucket = buckets.find(b => b.name === 'listing-images');
    if (!listingImagesBucket) {
      console.log('❌ Missing "listing-images" bucket - needs to be created');
    } else if (!listingImagesBucket.public) {
      console.log('⚠️ "listing-images" bucket should be PUBLIC for images to display in app');
      console.log('   Run this SQL in Supabase SQL Editor:');
      console.log('   UPDATE storage.buckets SET public = true WHERE name = \'listing-images\';');
    } else {
      console.log('✅ "listing-images" bucket is properly configured as public');
    }

    // Check for application-docs bucket
    const appDocsBucket = buckets.find(b => b.name === 'application-docs');
    if (!appDocsBucket) {
      console.log('❌ Missing "application-docs" bucket - needs to be created');
    } else if (appDocsBucket.public) {
      console.log('⚠️ "application-docs" bucket should be PRIVATE for security');
      console.log('   Run this SQL in Supabase SQL Editor:');
      console.log('   UPDATE storage.buckets SET public = false WHERE name = \'application-docs\';');
    } else {
      console.log('✅ "application-docs" bucket is properly configured as private');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the check
checkStoragePolicies().then(() => {
  console.log('\n✅ Storage check complete!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});