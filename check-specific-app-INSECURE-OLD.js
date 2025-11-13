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

async function checkSpecificApp() {
  console.log('🔍 CHECKING SPECIFIC APPLICATION');
  console.log('='.repeat(60));

  const appId = '95e9bd39-8416-49b9-93e5-85d54e3138b1';
  console.log(`\nLooking for application: ${appId}\n`);

  // Get full details of this application
  const sql = `
    SELECT
      a.*,
      l.title as listing_title,
      p.email as seeker_email
    FROM applications a
    LEFT JOIN listings l ON a.listing_id = l.id
    LEFT JOIN profiles p ON a.seeker_id = p.id
    WHERE a.id = '${appId}';
  `;

  const result = await executeSQL(sql);

  if (result && result.length > 0) {
    const app = result[0];
    console.log('✅ APPLICATION FOUND:');
    console.log(`  ID: ${app.id}`);
    console.log(`  Listing ID: ${app.listing_id}`);
    console.log(`  Listing Title: ${app.listing_title}`);
    console.log(`  Seeker ID: ${app.seeker_id}`);
    console.log(`  Seeker Email: ${app.seeker_email}`);
    console.log(`  Status: ${app.status}`);
    console.log(`  Created: ${new Date(app.created_at).toLocaleString()}`);
    console.log(`  Deleted At: ${app.deleted_at || 'NOT DELETED (active)'}`);

    if (app.deleted_at) {
      console.log('\n⚠️ This application is SOFT-DELETED');
      console.log('  It should not appear in the seeker\'s application list');
      console.log('  But it might still be blocking new applications if the constraint wasn\'t fixed');
    } else {
      console.log('\n✅ This application is ACTIVE');
      console.log('  It SHOULD appear in the seeker\'s application list');
      console.log('  It WILL block new applications to the same listing');
    }

    // Check if seeker can see their applications
    console.log('\n' + '='.repeat(60));
    console.log('CHECKING SEEKER\'S VIEW:');

    const seekerAppsSQL = `
      SELECT
        id,
        listing_id,
        status,
        deleted_at,
        created_at
      FROM applications
      WHERE seeker_id = '${app.seeker_id}'
      AND deleted_at IS NULL
      ORDER BY created_at DESC;
    `;

    const seekerApps = await executeSQL(seekerAppsSQL);
    if (seekerApps && seekerApps.length > 0) {
      console.log(`\nSeeker should see ${seekerApps.length} application(s):`);
      seekerApps.forEach((sa, idx) => {
        console.log(`  ${idx + 1}. ${sa.id} - Status: ${sa.status}`);
      });
    } else {
      console.log('\n❌ Query returns NO applications for this seeker');
      console.log('  This explains why they can\'t see their applications!');
    }

  } else {
    console.log('❌ Application not found');
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ CHECK COMPLETE');
}

checkSpecificApp().catch(console.error);