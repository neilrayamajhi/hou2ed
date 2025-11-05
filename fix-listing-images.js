const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service key for admin access
const supabase = createClient(
  'https://rixiofltzptwaiwxhhlf.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4OTg4NiwiZXhwIjoyMDczOTY1ODg2fQ.J9Oc77ZR1E435SqDsngt8ey4_WVOeTE6UASlYo17Gbc'
);

async function fixListingImages() {
  console.log('🔧 Fixing listing images (removing local file URLs)...\n');

  try {
    // Fetch all listings with images
    const { data: listings, error } = await supabase
      .from('listings')
      .select('id, title, images')
      .not('images', 'is', null);

    if (error) {
      console.error('❌ Error fetching listings:', error);
      return;
    }

    console.log(`📋 Found ${listings.length} listings with images field\n`);

    let fixedCount = 0;
    for (const listing of listings) {
      if (!Array.isArray(listing.images) || listing.images.length === 0) {
        continue;
      }

      // Filter out local file URLs
      const validUrls = listing.images.filter(url => {
        if (typeof url !== 'string') return false;
        // Keep only URLs that start with http/https
        return url.startsWith('http://') || url.startsWith('https://');
      });

      const invalidUrls = listing.images.filter(url => {
        if (typeof url !== 'string') return true;
        return url.startsWith('file://');
      });

      if (invalidUrls.length > 0) {
        console.log(`📍 Listing: ${listing.title}`);
        console.log(`   ID: ${listing.id}`);
        console.log(`   Total images: ${listing.images.length}`);
        console.log(`   Invalid (local) URLs: ${invalidUrls.length}`);
        console.log(`   Valid URLs: ${validUrls.length}`);

        // Update the listing with only valid URLs
        const { error: updateError } = await supabase
          .from('listings')
          .update({ images: validUrls.length > 0 ? validUrls : [] })
          .eq('id', listing.id);

        if (updateError) {
          console.error(`   ❌ Failed to update: ${updateError.message}`);
        } else {
          console.log(`   ✅ Fixed! Now has ${validUrls.length} valid image(s)`);
          fixedCount++;
        }
        console.log('');
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Fixed ${fixedCount} listing(s)`);
    console.log(`   📝 Total listings checked: ${listings.length}`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the fix
fixListingImages().then(() => {
  console.log('\n✅ Fix complete!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});