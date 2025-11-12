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

async function checkApplications() {
  console.log('🔍 CHECKING ALL APPLICATIONS IN DATABASE');
  console.log('='.repeat(60));
  console.log('');

  // Get all applications
  const appSQL = `
    SELECT
      a.id,
      a.listing_id,
      a.seeker_id,
      a.status,
      a.created_at,
      a.updated_at,
      p.email as seeker_email,
      p.full_name as seeker_name
    FROM applications a
    LEFT JOIN profiles p ON p.id = a.seeker_id
    ORDER BY a.created_at DESC;
  `;

  const apps = await executeSQL(appSQL);

  if (apps && apps.length > 0) {
    console.log(`Found ${apps.length} application(s):\n`);
    apps.forEach((app, i) => {
      console.log(`${i + 1}. Application ID: ${app.id}`);
      console.log(`   Status: ${app.status}`);
      console.log(`   Listing: ${app.listing_id}`);
      console.log(`   Seeker: ${app.seeker_email || 'Unknown'} (${app.seeker_id})`);
      console.log(`   Created: ${app.created_at}`);
      console.log('');
    });

    // Now let's update the first one for testing
    if (apps.length > 0 && apps[0].status !== 'rejected') {
      console.log('='.repeat(60));
      console.log('\n🔧 Setting up test scenario with first application...');

      const app = apps[0];
      const rejectSQL = `
        UPDATE applications
        SET
          status = 'rejected',
          decision_date = NOW() - INTERVAL '2 days',
          decision_note = 'Test rejection - cooldown period passed',
          stage_timestamps = stage_timestamps || jsonb_build_object('rejected', (NOW() - INTERVAL '2 days')::text),
          updated_at = NOW() - INTERVAL '2 days'
        WHERE id = '${app.id}'
        RETURNING id, status, decision_date;
      `;

      const result = await executeSQL(rejectSQL);
      if (result && result.length > 0) {
        console.log('✅ Application set to rejected (with old timestamp)');
        console.log('   You should now be able to resubmit to listing:', app.listing_id);
      }
    }
  } else {
    console.log('❌ No applications found in database');
    console.log('\nTo test the resubmission logic:');
    console.log('1. Submit an application through the app first');
    console.log('2. Run this script to set it to rejected');
    console.log('3. Try to apply again to the same listing');
  }
}

checkApplications().catch(console.error);