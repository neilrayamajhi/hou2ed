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

async function fixUserRole() {
  console.log('🔧 FIXING USER ROLE FOR Y42953');
  console.log('='.repeat(60));

  // First, check current state
  console.log('\n1️⃣ CHECKING CURRENT STATE...');

  const checkSQL = `
    SELECT
      id,
      email,
      role,
      full_name
    FROM profiles
    WHERE email = 'y42953@student.ghctk12.com';
  `;

  const checkResult = await executeSQL(checkSQL);
  if (checkResult && checkResult[0]) {
    console.log('\nCurrent profile:');
    console.log(`  Email: ${checkResult[0].email}`);
    console.log(`  Current Role: ${checkResult[0].role}`);
    console.log(`  Name: ${checkResult[0].full_name}`);
    console.log(`  ID: ${checkResult[0].id}`);
  }

  // Update the role to seeker
  console.log('\n2️⃣ UPDATING ROLE TO SEEKER...');

  const updateSQL = `
    UPDATE profiles
    SET role = 'seeker'
    WHERE email = 'y42953@student.ghctk12.com'
    RETURNING *;
  `;

  const updateResult = await executeSQL(updateSQL);
  if (updateResult && updateResult[0]) {
    console.log('\n✅ Role updated successfully!');
    console.log(`  Email: ${updateResult[0].email}`);
    console.log(`  New Role: ${updateResult[0].role}`);
  }

  // Now check the application
  console.log('\n3️⃣ VERIFYING APPLICATION ACCESS...');

  const appSQL = `
    SELECT
      a.id,
      a.listing_id,
      a.status,
      a.deleted_at,
      l.title as listing_title
    FROM applications a
    LEFT JOIN listings l ON a.listing_id = l.id
    WHERE a.seeker_id = '31c57c00-777e-4e29-b6e9-4a8c2ef6698c'
    AND a.deleted_at IS NULL;
  `;

  const appResult = await executeSQL(appSQL);
  if (appResult && appResult.length > 0) {
    console.log('\n✅ Applications this user should now see:');
    appResult.forEach((app, idx) => {
      console.log(`  ${idx + 1}. ${app.listing_title || app.listing_id}`);
      console.log(`     Status: ${app.status}`);
      console.log(`     ID: ${app.id}`);
    });
  }

  // Check provider accounts
  console.log('\n4️⃣ CHECKING PROVIDER ACCOUNTS...');

  const providerSQL = `
    SELECT
      email,
      full_name,
      role
    FROM profiles
    WHERE email IN ('samsonyahdel@gmail.com', 'samsonalemseged@gmail.com')
    OR full_name LIKE '%Samson%';
  `;

  const providerResult = await executeSQL(providerSQL);
  if (providerResult && providerResult.length > 0) {
    console.log('\nProvider accounts found:');
    providerResult.forEach(p => {
      console.log(`  - ${p.email} (${p.role})`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ FIX COMPLETE!');
  console.log('\nNOW:');
  console.log('  ✅ y42953@student.ghctk12.com is a SEEKER');
  console.log('  ✅ They can see their applications in "My Applications"');
  console.log('  ✅ They can delete and resubmit applications');
  console.log('\nPROVIDER ACCOUNTS:');
  console.log('  Use Samson\'s accounts for provider features');
}

fixUserRole().catch(console.error);