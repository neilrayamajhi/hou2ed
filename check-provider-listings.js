const fetch = require('node-fetch');

const PROJECT_REF = 'rixiofltzptwaiwxhhlf';
const ACCESS_TOKEN = 'sbp_b587d82512ccd48326fa62de11a9e5e94bf1688a';

async function executeSQL(sql) {
  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.log(`Error: ${error.message}`);
    return null;
  }
}

async function checkProviderAndListings() {
  console.log('🔍 CHECKING PROVIDER AND LISTING DETAILS');
  console.log('='.repeat(60));
  console.log('');

  // 1. Check the Neil house listing and its provider
  console.log('📋 Checking "Neil house" listing:');

  const listingSQL = `
    SELECT
      l.id as listing_id,
      l.title,
      l.provider_id,
      p.email as provider_email,
      p.role as provider_role
    FROM listings l
    LEFT JOIN profiles p ON p.id = l.provider_id
    WHERE l.title = 'Neil house'
    LIMIT 1;
  `;

  const listingResult = await executeSQL(listingSQL);

  if (listingResult && listingResult.length > 0) {
    const listing = listingResult[0];
    console.log(`   Listing ID: ${listing.listing_id}`);
    console.log(`   Title: ${listing.title}`);
    console.log(`   Provider ID: ${listing.provider_id}`);
    console.log(`   Provider Email: ${listing.provider_email || 'Unknown'}`);
    console.log(`   Provider Role: ${listing.provider_role || 'Not set'}`);

    // 2. Check applications for this listing
    console.log('\n📋 Applications for this listing:');

    const appsSQL = `
      SELECT
        a.id,
        a.seeker_id,
        a.status,
        a.created_at,
        p.email as seeker_email
      FROM applications a
      LEFT JOIN profiles p ON p.id = a.seeker_id
      WHERE a.listing_id = '${listing.listing_id}'
      ORDER BY a.created_at DESC;
    `;

    const appsResult = await executeSQL(appsSQL);

    if (appsResult && appsResult.length > 0) {
      console.log(`   ✅ Found ${appsResult.length} applications:`);
      appsResult.forEach((app, index) => {
        console.log(`   ${index + 1}. Application ${app.id}`);
        console.log(`      Seeker: ${app.seeker_email} (${app.seeker_id})`);
        console.log(`      Status: ${app.status}`);
        console.log(`      Created: ${app.created_at}`);
      });
    } else {
      console.log('   No applications found for this listing');
    }

    console.log('\n📝 PROVIDER ACCESS NEEDED:');
    console.log(`   Provider ${listing.provider_id} should be able to see applications`);
    console.log(`   for their listing "${listing.title}"`);

    if (listing.provider_email) {
      console.log(`\n   To access as provider, log in with: ${listing.provider_email}`);
    }

    return listing.provider_id;

  } else {
    console.log('   ❌ "Neil house" listing not found');

    // Check all listings
    console.log('\n📋 All listings in database:');
    const allListingsSQL = `
      SELECT
        l.id,
        l.title,
        l.provider_id,
        p.email as provider_email
      FROM listings l
      LEFT JOIN profiles p ON p.id = l.provider_id
      LIMIT 10;
    `;

    const allListings = await executeSQL(allListingsSQL);
    if (allListings && allListings.length > 0) {
      allListings.forEach((l, i) => {
        console.log(`   ${i + 1}. "${l.title}" - Provider: ${l.provider_email || l.provider_id}`);
      });
    }
  }
}

checkProviderAndListings().catch(console.error);