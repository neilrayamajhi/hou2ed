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
    if (result.error) {
      console.error('SQL Error:', result.error);
    }
    return result;
  } catch (error) {
    console.log(`Error: ${error.message}`);
    return null;
  }
}

async function setupTest() {
  console.log('🔧 SETTING UP RESUBMISSION TEST');
  console.log('='.repeat(60));
  console.log('');

  // Update the existing rejected application to have an old rejection date
  const updateSQL = `
    UPDATE applications
    SET
      stage_timestamps = stage_timestamps || jsonb_build_object('rejected', (NOW() - INTERVAL '2 days')::text),
      notes = 'Test rejection - cooldown period passed',
      updated_at = NOW() - INTERVAL '2 days'
    WHERE id = '0f1b7a74-5df9-4106-b955-5d23e2414143'
    RETURNING id, status, stage_timestamps, listing_id, updated_at;
  `;

  const result = await executeSQL(updateSQL);

  console.log('Query result:', JSON.stringify(result, null, 2));

  if (result && result.length > 0) {
    const app = result[0];
    console.log('✅ Application updated successfully!');
    console.log('');
    console.log('📋 Application Details:');
    console.log(`   ID: ${app.id}`);
    console.log(`   Status: ${app.status}`);
    console.log(`   Listing ID: ${app.listing_id}`);
    console.log(`   Rejection Time: ${app.stage_timestamps?.rejected || app.updated_at} (2 days ago)`);
    console.log('');
    console.log('='.repeat(60));
    console.log('');
    console.log('📱 TEST INSTRUCTIONS:');
    console.log('');
    console.log('1. In the app, try to apply to listing: ' + app.listing_id);
    console.log('2. The app should allow you to resubmit since 24 hours have passed');
    console.log('3. You should see a message saying "You can now submit a new application"');
    console.log('');
    console.log('Note: The old application will be automatically deleted when you submit the new one.');
  } else {
    console.log('❌ Failed to update application');
  }
}

setupTest().catch(console.error);