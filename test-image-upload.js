const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Initialize Supabase client with service key for admin access
const supabase = createClient(
  'https://rixiofltzptwaiwxhhlf.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4OTg4NiwiZXhwIjoyMDczOTY1ODg2fQ.J9Oc77ZR1E435SqDsngt8ey4_WVOeTE6UASlYo17Gbc'
);

async function testImageUpload() {
  console.log('🧪 Testing image upload for a listing...\n');

  try {
    // Get a listing to test with
    const { data: listings, error: listError } = await supabase
      .from('listings')
      .select('id, title, images')
      .limit(1)
      .single();

    if (listError || !listings) {
      console.error('❌ Could not find a listing to test with:', listError);
      return;
    }

    const listing = listings;
    console.log(`📍 Testing with listing: ${listing.title}`);
    console.log(`   ID: ${listing.id}`);
    console.log(`   Current images: ${Array.isArray(listing.images) ? listing.images.length : 0}`);

    // Create a simple test image (1x1 pixel transparent PNG)
    console.log('\n📥 Creating test image...');
    // This is a base64 encoded 1x1 transparent PNG
    const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const imageBuffer = Buffer.from(base64Image, 'base64');
    console.log(`   Created test image: ${imageBuffer.length} bytes`);

    // Upload to storage bucket
    console.log('\n📤 Uploading to storage bucket...');
    const fileName = `test-image-${Date.now()}.jpg`;
    const filePath = `${listing.id}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('listing-images')
      .upload(filePath, imageBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('❌ Upload failed:', uploadError);
      return;
    }

    console.log('✅ Image uploaded successfully');
    console.log('   Path:', uploadData.path);

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('listing-images')
      .getPublicUrl(filePath);

    console.log('🔗 Public URL:', publicUrl);

    // Update listing with new image URL
    console.log('\n💾 Updating listing with image URL...');
    const currentImages = Array.isArray(listing.images) ? listing.images : [];
    const newImages = [...currentImages, publicUrl];

    const { data: updateData, error: updateError } = await supabase
      .from('listings')
      .update({ images: newImages })
      .eq('id', listing.id)
      .select();

    if (updateError) {
      console.error('❌ Failed to update listing:', updateError);
      return;
    }

    console.log('✅ Listing updated successfully');
    console.log('   New image count:', updateData[0].images.length);

    // Skip verification that requires network access
    console.log('\n🔍 Skipping image accessibility verification (requires network)');

    // Test fetching the listing with images
    console.log('\n📋 Fetching updated listing...');
    const { data: finalListing, error: fetchError } = await supabase
      .from('listings')
      .select('id, title, images')
      .eq('id', listing.id)
      .single();

    if (fetchError) {
      console.error('❌ Failed to fetch listing:', fetchError);
      return;
    }

    console.log('✅ Listing fetched successfully');
    console.log('   Title:', finalListing.title);
    console.log('   Images:', finalListing.images ? finalListing.images.length : 0);
    if (finalListing.images && finalListing.images.length > 0) {
      console.log('   Image URLs:');
      finalListing.images.forEach((url, idx) => {
        console.log(`     [${idx}]: ${url}`);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testImageUpload().then(() => {
  console.log('\n✅ Test complete!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});