const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service key for admin access
const supabase = createClient(
  'https://rixiofltzptwaiwxhhlf.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4OTg4NiwiZXhwIjoyMDczOTY1ODg2fQ.J9Oc77ZR1E435SqDsngt8ey4_WVOeTE6UASlYo17Gbc'
);

async function checkListingImages() {
  console.log('🔍 Checking listing images in database...\n');

  try {
    // Fetch all listings with their images
    const { data: listings, error } = await supabase
      .from('listings')
      .select('id, title, provider_id, images, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Error fetching listings:', error);
      return;
    }

    console.log(`📋 Found ${listings.length} listings\n`);

    // Check each listing
    for (const listing of listings) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📍 Listing: ${listing.title}`);
      console.log(`   ID: ${listing.id}`);
      console.log(`   Provider ID: ${listing.provider_id}`);
      console.log(`   Created: ${new Date(listing.created_at).toLocaleString()}`);
      console.log(`   Updated: ${new Date(listing.updated_at).toLocaleString()}`);

      // Check images field
      if (listing.images === null) {
        console.log('   🖼️ Images: NULL (no images field)');
      } else if (Array.isArray(listing.images)) {
        console.log(`   🖼️ Images: Array with ${listing.images.length} image(s)`);
        if (listing.images.length > 0) {
          listing.images.forEach((url, idx) => {
            console.log(`      [${idx}]: ${url}`);
          });
        }
      } else {
        console.log(`   🖼️ Images: Unexpected type - ${typeof listing.images}`);
        console.log(`      Value:`, listing.images);
      }

      // Check storage bucket for this listing
      console.log('\n   📦 Checking storage bucket for this listing...');
      const { data: files, error: storageError } = await supabase.storage
        .from('listing-images')
        .list(listing.id, {
          limit: 10
        });

      if (storageError) {
        console.log(`   ⚠️ Could not check storage: ${storageError.message}`);
      } else if (!files || files.length === 0) {
        console.log('   📁 No files found in storage bucket');
      } else {
        console.log(`   📁 Found ${files.length} file(s) in storage:`);
        files.forEach(file => {
          const publicUrl = supabase.storage
            .from('listing-images')
            .getPublicUrl(`${listing.id}/${file.name}`);
          console.log(`      - ${file.name} (${(file.metadata?.size / 1024).toFixed(2)}KB)`);
          console.log(`        URL: ${publicUrl.data.publicUrl}`);
        });
      }
      console.log('');
    }

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📊 Summary:');
    const withImages = listings.filter(l => Array.isArray(l.images) && l.images.length > 0);
    const withoutImages = listings.filter(l => !l.images || (Array.isArray(l.images) && l.images.length === 0));

    console.log(`   ✅ Listings with images: ${withImages.length}`);
    console.log(`   ❌ Listings without images: ${withoutImages.length}`);

    if (withoutImages.length > 0) {
      console.log('\n   Listings without images:');
      withoutImages.forEach(l => {
        console.log(`   - ${l.title} (ID: ${l.id})`);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the check
checkListingImages().then(() => {
  console.log('\n✅ Check complete!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});