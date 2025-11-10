const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4OTg4NiwiZXhwIjoyMDczOTY1ODg2fQ.J9Oc77ZR1E435SqDsngt8ey4_WVOeTE6UASlYo17Gbc';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAllListings() {
  console.log('Checking ALL listings with service role key...\n');

  try {
    // Get all listings regardless of status
    const { data, error, count } = await supabase
      .from('listings')
      .select('*', { count: 'exact' });

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log(`Total listings in database: ${count || 0}`);

    if (data && data.length > 0) {
      console.log('\nAll listings:');
      data.forEach((listing, i) => {
        console.log(`\n${i + 1}. ${listing.title}`);
        console.log(`   ID: ${listing.id}`);
        console.log(`   Provider ID: ${listing.provider_id}`);
        console.log(`   Active: ${listing.is_active}`);
        console.log(`   Created: ${listing.created_at}`);
        console.log(`   Updated: ${listing.updated_at}`);
      });

      // Check by provider
      const providers = [...new Set(data.map(l => l.provider_id))];
      console.log('\n\nListings by provider:');
      providers.forEach(providerId => {
        const providerListings = data.filter(l => l.provider_id === providerId);
        console.log(`\nProvider ${providerId}: ${providerListings.length} listings`);
        providerListings.forEach(l => {
          console.log(`  - ${l.title} (Active: ${l.is_active})`);
        });
      });
    } else {
      console.log('\nNo listings found at all!');
      console.log('This means listings are not being saved to the database.');
    }

    // Also check if there are any soft-deleted listings
    const { data: deletedData } = await supabase
      .from('listings')
      .select('id, title, is_active, deleted_at')
      .not('deleted_at', 'is', null);

    if (deletedData && deletedData.length > 0) {
      console.log('\n\nSoft-deleted listings:');
      deletedData.forEach(l => {
        console.log(`  - ${l.title} (Deleted at: ${l.deleted_at})`);
      });
    }

  } catch (err) {
    console.error('Error:', err);
  }
}

checkAllListings();