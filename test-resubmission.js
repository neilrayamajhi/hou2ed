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

async function testResubmissionScenario() {
  console.log('🔧 SETTING UP TEST SCENARIO FOR RESUBMISSION');
  console.log('='.repeat(60));
  console.log('');

  // Find a recent application to test with
  const findAppSQL = `
    SELECT
      a.id,
      a.listing_id,
      a.seeker_id,
      a.status,
      a.created_at,
      a.updated_at,
      a.decision_date
    FROM applications a
    ORDER BY a.created_at DESC
    LIMIT 3;
  `;

  console.log('📋 Finding recent applications...');
  const apps = await executeSQL(findAppSQL);

  if (apps && apps.length > 0) {
    console.log('\nFound applications:');
    apps.forEach((app, i) => {
      console.log(`${i + 1}. ID: ${app.id}`);
      console.log(`   Status: ${app.status}`);
      console.log(`   Listing: ${app.listing_id}`);
      console.log(`   Seeker: ${app.seeker_id}`);
      console.log('');
    });

    // Test different scenarios
    if (apps.length > 0) {
      const app = apps[0];

      // Scenario 1: Set application to rejected (without cooldown period)
      console.log('\n📝 TEST SCENARIO 1: Recent Rejection (within 24 hours)');
      console.log('Setting first application to rejected with recent timestamp...');

      const rejectSQL = `
        UPDATE applications
        SET
          status = 'rejected',
          decision_date = NOW(),
          decision_note = 'Test rejection for cooldown period',
          stage_timestamps = stage_timestamps || jsonb_build_object('rejected', NOW()::text),
          updated_at = NOW()
        WHERE id = '${app.id}'
        RETURNING id, status, decision_date;
      `;

      const rejectResult = await executeSQL(rejectSQL);
      if (rejectResult && rejectResult.length > 0) {
        console.log('✅ Application rejected successfully');
        console.log('   Decision date:', rejectResult[0].decision_date);
        console.log('\n⏰ User should NOT be able to resubmit for 24 hours');
      }
    }

    if (apps.length > 1) {
      const app = apps[1];

      // Scenario 2: Set application to rejected with old timestamp (past cooldown)
      console.log('\n📝 TEST SCENARIO 2: Old Rejection (past 24 hours)');
      console.log('Setting second application to rejected with old timestamp...');

      const oldRejectSQL = `
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

      const oldRejectResult = await executeSQL(oldRejectSQL);
      if (oldRejectResult && oldRejectResult.length > 0) {
        console.log('✅ Application rejected with old timestamp');
        console.log('   Decision date:', oldRejectResult[0].decision_date);
        console.log('\n✅ User SHOULD be able to resubmit now');
      }
    }

    if (apps.length > 2) {
      const app = apps[2];

      // Scenario 3: Set application to withdrawn
      console.log('\n📝 TEST SCENARIO 3: Withdrawn Application');
      console.log('Setting third application to withdrawn...');

      const withdrawSQL = `
        UPDATE applications
        SET
          status = 'withdrawn',
          stage_timestamps = stage_timestamps || jsonb_build_object('withdrawn', NOW()::text),
          notes = 'Test withdrawal',
          updated_at = NOW()
        WHERE id = '${app.id}'
        RETURNING id, status;
      `;

      const withdrawResult = await executeSQL(withdrawSQL);
      if (withdrawResult && withdrawResult.length > 0) {
        console.log('✅ Application withdrawn successfully');
        console.log('\n✅ User SHOULD be able to submit a new application immediately');
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📱 TEST INSTRUCTIONS:');
    console.log('1. Try to apply to the same listing as the first app (should be blocked)');
    console.log('2. Try to apply to the same listing as the second app (should be allowed)');
    console.log('3. Try to apply to the same listing as the third app (should be allowed)');
    console.log('');
    console.log('The app should show appropriate messages for each scenario.');

  } else {
    console.log('❌ No applications found to test with');
    console.log('Please create some applications first.');
  }
}

testResubmissionScenario().catch(console.error);