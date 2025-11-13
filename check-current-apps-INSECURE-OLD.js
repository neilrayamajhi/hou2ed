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

async function checkCurrentApps() {
  console.log('🔍 CHECKING CURRENT APPLICATIONS STATE');
  console.log('='.repeat(60));

  // Check all applications with details
  const sql = `
    SELECT
      a.id,
      a.listing_id,
      a.seeker_id,
      a.status,
      a.deleted_at,
      a.created_at,
      l.title as listing_title,
      p.email as seeker_email
    FROM applications a
    LEFT JOIN listings l ON a.listing_id = l.id
    LEFT JOIN profiles p ON a.seeker_id = p.id
    ORDER BY a.created_at DESC;
  `;

  const result = await executeSQL(sql);

  if (result && result.length > 0) {
    console.log(`\nFound ${result.length} applications:\n`);

    // Group by deleted status
    const activeApps = result.filter(app => !app.deleted_at);
    const deletedApps = result.filter(app => app.deleted_at);

    if (activeApps.length > 0) {
      console.log(`✅ ACTIVE APPLICATIONS (${activeApps.length}):`);
      activeApps.forEach((app, index) => {
        console.log(`\n  ${index + 1}. Application ID: ${app.id}`);
        console.log(`     Listing: ${app.listing_title || app.listing_id}`);
        console.log(`     Seeker: ${app.seeker_email || app.seeker_id}`);
        console.log(`     Status: ${app.status}`);
        console.log(`     Created: ${new Date(app.created_at).toLocaleString()}`);
      });
    }

    if (deletedApps.length > 0) {
      console.log(`\n❌ SOFT-DELETED APPLICATIONS (${deletedApps.length}):`);
      deletedApps.forEach((app, index) => {
        console.log(`\n  ${index + 1}. Application ID: ${app.id}`);
        console.log(`     Listing: ${app.listing_title || app.listing_id}`);
        console.log(`     Seeker: ${app.seeker_email || app.seeker_id}`);
        console.log(`     Status: ${app.status}`);
        console.log(`     Deleted: ${new Date(app.deleted_at).toLocaleString()}`);
      });
    }

    // Check for any duplicates (same seeker + listing)
    console.log('\n' + '='.repeat(60));
    console.log('CHECKING FOR DUPLICATE COMBINATIONS:');

    const dupSQL = `
      SELECT
        seeker_id,
        listing_id,
        COUNT(*) as total_count,
        COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as active_count,
        COUNT(CASE WHEN deleted_at IS NOT NULL THEN 1 END) as deleted_count
      FROM applications
      GROUP BY seeker_id, listing_id
      HAVING COUNT(*) > 1 OR COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) > 1;
    `;

    const dupResult = await executeSQL(dupSQL);

    if (dupResult && dupResult.length > 0) {
      console.log('\n⚠️ Found duplicate combinations:');
      dupResult.forEach(dup => {
        console.log(`  Seeker: ${dup.seeker_id.substring(0, 8)}...`);
        console.log(`  Listing: ${dup.listing_id.substring(0, 8)}...`);
        console.log(`  Total: ${dup.total_count} (Active: ${dup.active_count}, Deleted: ${dup.deleted_count})`);
        if (dup.active_count > 1) {
          console.log(`  ❌ PROBLEM: Multiple active applications!`);
        }
      });
    } else {
      console.log('✅ No problematic duplicates found');
    }

  } else {
    console.log('No applications found in database');
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ CHECK COMPLETE');
}

checkCurrentApps().catch(console.error);