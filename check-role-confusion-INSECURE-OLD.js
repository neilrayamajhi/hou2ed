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

async function checkRoleConfusion() {
  console.log('🔍 CHECKING ROLE CONFUSION ISSUE');
  console.log('='.repeat(60));

  // Check the profile that submitted the application
  const profileSQL = `
    SELECT
      id,
      email,
      role,
      full_name,
      created_at
    FROM profiles
    WHERE id = '31c57c00-777e-4e29-b6e9-4a8c2ef6698c';
  `;

  const profile = await executeSQL(profileSQL);
  if (profile && profile[0]) {
    console.log('\n👤 PROFILE DETAILS:');
    console.log(`  ID: ${profile[0].id}`);
    console.log(`  Email: ${profile[0].email}`);
    console.log(`  Role: ${profile[0].role}`);
    console.log(`  Name: ${profile[0].full_name || 'Not set'}`);

    if (profile[0].role === 'provider') {
      console.log('\n⚠️ PROBLEM IDENTIFIED:');
      console.log('  This account has role "provider" but submitted an application as a seeker!');
      console.log('  This causes issues because:');
      console.log('  1. The application list filters by role');
      console.log('  2. A provider account shouldn\'t be able to apply to listings');
    }
  }

  // Check all y42953 accounts
  console.log('\n' + '='.repeat(60));
  console.log('CHECKING ALL RELATED ACCOUNTS:');

  const allAccountsSQL = `
    SELECT
      id,
      email,
      role,
      created_at
    FROM profiles
    WHERE email LIKE 'y4295%@student.ghctk12.com'
    ORDER BY email;
  `;

  const accounts = await executeSQL(allAccountsSQL);
  if (accounts && accounts.length > 0) {
    console.log(`\nFound ${accounts.length} related accounts:`);
    accounts.forEach(acc => {
      console.log(`  ${acc.email} - Role: ${acc.role}`);
      console.log(`    ID: ${acc.id}`);
    });
  }

  // Check which account you're actually logged in as
  console.log('\n' + '='.repeat(60));
  console.log('TO DIAGNOSE YOUR CURRENT SITUATION:');
  console.log('');
  console.log('1. When logged in as SEEKER (y42952@student.ghctk12.com):');
  console.log('   - You won\'t see applications because the app was submitted by the other account');
  console.log('   - You CAN submit a new application');
  console.log('');
  console.log('2. When logged in as PROVIDER (y42953@student.ghctk12.com):');
  console.log('   - You won\'t see applications in "My Applications" (providers see them differently)');
  console.log('   - You CANNOT submit new applications (the existing one blocks it)');
  console.log('');

  // Fix suggestion
  console.log('='.repeat(60));
  console.log('RECOMMENDED FIX:');
  console.log('');
  console.log('Option 1: Delete the problematic application');
  console.log('  We can delete the application submitted by the provider account');
  console.log('');
  console.log('Option 2: Switch the provider account to seeker role');
  console.log('  We can change y42953 from provider to seeker');
  console.log('');
  console.log('Which would you prefer?');
}

checkRoleConfusion().catch(console.error);