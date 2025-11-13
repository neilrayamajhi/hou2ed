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

async function checkAllTables() {
  console.log('🔍 COMPREHENSIVE DATABASE CHECK');
  console.log('='.repeat(60));

  // Check applications table count
  console.log('\n1️⃣ APPLICATIONS TABLE:');
  const appCountSQL = `SELECT COUNT(*) as total, COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as active FROM applications;`;
  const appCount = await executeSQL(appCountSQL);
  if (appCount && appCount[0]) {
    console.log(`  Total records: ${appCount[0].total}`);
    console.log(`  Active (not deleted): ${appCount[0].active}`);
  }

  // Check profiles table
  console.log('\n2️⃣ PROFILES TABLE:');
  const profileSQL = `
    SELECT id, email, role, created_at
    FROM profiles
    ORDER BY created_at DESC
    LIMIT 5;
  `;
  const profiles = await executeSQL(profileSQL);
  if (profiles && profiles.length > 0) {
    console.log(`  Found ${profiles.length} recent profiles:`);
    profiles.forEach(p => {
      console.log(`    - ${p.email} (${p.role}) - ID: ${p.id.substring(0, 8)}...`);
    });
  }

  // Check listings table
  console.log('\n3️⃣ LISTINGS TABLE:');
  const listingSQL = `
    SELECT id, title, provider_id, is_active, created_at
    FROM listings
    WHERE is_active = true
    ORDER BY created_at DESC
    LIMIT 5;
  `;
  const listings = await executeSQL(listingSQL);
  if (listings && listings.length > 0) {
    console.log(`  Found ${listings.length} active listings:`);
    listings.forEach(l => {
      console.log(`    - ${l.title} - ID: ${l.id.substring(0, 8)}...`);
    });
  }

  // Check for any recent database activity
  console.log('\n4️⃣ RECENT ACTIVITY:');
  const activitySQL = `
    SELECT
      'application' as type,
      id,
      created_at
    FROM applications
    WHERE created_at > NOW() - INTERVAL '24 hours'
    UNION ALL
    SELECT
      'listing' as type,
      id,
      created_at
    FROM listings
    WHERE created_at > NOW() - INTERVAL '24 hours'
    ORDER BY created_at DESC;
  `;

  const activity = await executeSQL(activitySQL);
  if (activity && activity.length > 0) {
    console.log(`  Recent activity in last 24 hours:`);
    activity.forEach(a => {
      console.log(`    - ${a.type}: ${a.id} at ${new Date(a.created_at).toLocaleString()}`);
    });
  } else {
    console.log('  No activity in last 24 hours');
  }

  // Check for any orphaned documents
  console.log('\n5️⃣ DOCUMENTS TABLE:');
  const docSQL = `
    SELECT
      COUNT(*) as total,
      COUNT(DISTINCT application_id) as unique_apps
    FROM documents;
  `;
  const docs = await executeSQL(docSQL);
  if (docs && docs[0]) {
    console.log(`  Total documents: ${docs[0].total}`);
    console.log(`  Unique applications: ${docs[0].unique_apps}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ CHECK COMPLETE');
}

checkAllTables().catch(console.error);