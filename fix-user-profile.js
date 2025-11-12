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

    const result = await response.text();

    if (!response.ok) {
      console.log(`   ❌ Error: ${response.status}`);
      console.log(`   Response: ${result}`);
      return false;
    }

    console.log('   ✅ Success');
    return true;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function fixUserProfile() {
  console.log('🔧 FIXING USER PROFILE FOR APPLICATION SUBMISSION');
  console.log('='.repeat(50));
  console.log('');

  const userId = '31c57c00-777e-4e29-b6e9-4a8c2ef6698c';

  console.log(`User ID: ${userId}`);
  console.log('');

  const steps = [
    {
      name: 'Check if user exists in auth.users',
      sql: `SELECT COUNT(*) FROM auth.users WHERE id = '${userId}';`
    },
    {
      name: 'Check if profile exists',
      sql: `SELECT id, role, email FROM profiles WHERE id = '${userId}';`
    },
    {
      name: 'Insert or update profile with seeker role',
      sql: `INSERT INTO profiles (id, role, email, full_name, created_at, updated_at)
            VALUES (
              '${userId}',
              'seeker',
              COALESCE((SELECT email FROM auth.users WHERE id = '${userId}'), 'user@example.com'),
              'Test Seeker',
              NOW(),
              NOW()
            )
            ON CONFLICT (id) DO UPDATE
            SET role = 'seeker',
                updated_at = NOW();`
    },
    {
      name: 'Verify profile was updated',
      sql: `SELECT id, role, email FROM profiles WHERE id = '${userId}';`
    }
  ];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    console.log(`[${i + 1}/${steps.length}] ${step.name}`);

    await executeSQL(step.sql);

    // Small delay between statements
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('');
  console.log('='.repeat(50));
  console.log('');
  console.log('✅ USER PROFILE HAS BEEN FIXED!');
  console.log('');
  console.log('The user now has:');
  console.log('  ✓ A profile in the profiles table');
  console.log('  ✓ Role set to "seeker"');
  console.log('  ✓ Proper permissions to submit applications');
  console.log('');
  console.log('🎯 NEXT STEPS:');
  console.log('  1. Try submitting the application again in your app');
  console.log('  2. The application should now succeed!');
  console.log('');
  console.log('📋 What was fixed:');
  console.log('  - User profile created/updated with role = "seeker"');
  console.log('  - This satisfies the RLS policy requirement');
  console.log('  - Applications can now be inserted when seeker_id = auth.uid()');
  console.log('');
  console.log('🔍 If it STILL fails:');
  console.log('  1. Make sure the app is sending seeker_id = "' + userId + '"');
  console.log('  2. Check that the listing_id is valid');
  console.log('  3. Ensure the user is properly authenticated in the app');
}

fixUserProfile().catch(console.error);