const fetch = require('node-fetch');

async function deleteUser() {
  const projectRef = 'rixiofltzptwaiwxhhlf';
  const accessToken = 'sbp_35b563bea5d4526a6d8fdd91debc5ddb9d180c03';
  const emailToDelete = 'sagun.rayamajhi@gmail.com';

  console.log(`🔍 Looking for user with email: ${emailToDelete}\n`);

  // Step 1: Find the user in profiles table
  const findUserQuery = `
    SELECT id, email, full_name, role, created_at
    FROM profiles
    WHERE email = '${emailToDelete}';
  `;

  try {
    console.log('Step 1: Finding user in profiles table...');
    const findResponse = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: findUserQuery })
      }
    );

    if (!findResponse.ok) {
      console.error('❌ Failed to find user:', await findResponse.text());
      return;
    }

    const findResult = await findResponse.json();
    console.log('Query result:', JSON.stringify(findResult, null, 2));

    if (!findResult || findResult.length === 0) {
      console.log('⚠️  User not found in profiles table. Checking auth.users...\n');

      // Check auth.users table
      const findAuthQuery = `
        SELECT id, email, created_at
        FROM auth.users
        WHERE email = '${emailToDelete}';
      `;

      const findAuthResponse = await fetch(
        `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: findAuthQuery })
        }
      );

      if (!findAuthResponse.ok) {
        console.error('❌ Failed to check auth.users:', await findAuthResponse.text());
        return;
      }

      const authResult = await findAuthResponse.json();
      console.log('Auth query result:', JSON.stringify(authResult, null, 2));

      if (!authResult || authResult.length === 0) {
        console.log('✅ User does not exist in either profiles or auth.users tables!');
        console.log('   The user may have already been deleted.');
        return;
      }

      console.log('\n📍 User found in auth.users but not in profiles!');
      console.log('   This might be why deletion failed - orphaned auth record.\n');
    } else {
      console.log(`\n✅ Found user: ${findResult[0]?.full_name || 'Unknown'} (${findResult[0]?.email})`);
      console.log(`   Role: ${findResult[0]?.role}`);
      console.log(`   ID: ${findResult[0]?.id}\n`);
    }

    // Step 2: Delete from auth.users (this should cascade to profiles via trigger)
    console.log('Step 2: Deleting user from auth.users...');

    const deleteAuthQuery = `
      DELETE FROM auth.users
      WHERE email = '${emailToDelete}';
    `;

    const deleteResponse = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: deleteAuthQuery })
      }
    );

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      console.error('❌ Failed to delete from auth.users:', errorText);

      console.log('\n🔍 DEBUGGING: Why deletion might fail:\n');
      console.log('1. RLS Policies: auth.users table might have RLS preventing deletion');
      console.log('2. Foreign Key Constraints: User might have related data (listings, applications, messages)');
      console.log('3. Triggers: Database triggers might be blocking the deletion');
      console.log('\nLet me check for related data...\n');

      // Check for related data
      await checkRelatedData(projectRef, accessToken, emailToDelete);

      return;
    }

    console.log('✅ Successfully deleted from auth.users!\n');

    // Step 3: Verify deletion from profiles (should happen automatically via cascade/trigger)
    console.log('Step 3: Verifying deletion from profiles...');

    const verifyResponse = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: findUserQuery })
      }
    );

    const verifyResult = await verifyResponse.json();

    if (!verifyResult || verifyResult.length === 0) {
      console.log('✅ User successfully deleted from profiles table too!\n');
      console.log('🎉 User deletion complete!');
    } else {
      console.log('⚠️  User still exists in profiles. Deleting manually...\n');

      const deleteProfileQuery = `
        DELETE FROM profiles
        WHERE email = '${emailToDelete}';
      `;

      const deleteProfileResponse = await fetch(
        `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: deleteProfileQuery })
        }
      );

      if (deleteProfileResponse.ok) {
        console.log('✅ Successfully deleted from profiles table!\n');
        console.log('🎉 User deletion complete!');
      } else {
        console.error('❌ Failed to delete from profiles:', await deleteProfileResponse.text());
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function checkRelatedData(projectRef, accessToken, email) {
  console.log('Checking for related data that might prevent deletion...\n');

  // Get user ID first
  const getUserIdQuery = `
    SELECT id FROM auth.users WHERE email = '${email}';
  `;

  const userIdResponse = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: getUserIdQuery })
    }
  );

  const userIdResult = await userIdResponse.json();
  const userId = userIdResult?.[0]?.id;

  if (!userId) {
    console.log('Could not find user ID to check related data.');
    return;
  }

  console.log(`User ID: ${userId}\n`);

  // Check various tables for related data
  const checks = [
    { table: 'listings', column: 'provider_id', name: 'Listings' },
    { table: 'applications', column: 'seeker_id', name: 'Applications (as seeker)' },
    { table: 'applications', column: 'provider_id', name: 'Applications (as provider)' },
    { table: 'messages', column: 'sender_id', name: 'Messages' },
    { table: 'saved_listings', column: 'seeker_id', name: 'Saved listings' },
  ];

  for (const check of checks) {
    const query = `
      SELECT COUNT(*) as count FROM ${check.table} WHERE ${check.column} = '${userId}';
    `;

    try {
      const response = await fetch(
        `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query })
        }
      );

      if (response.ok) {
        const result = await response.json();
        const count = result?.[0]?.count || 0;
        if (count > 0) {
          console.log(`⚠️  ${check.name}: ${count} records found`);
        } else {
          console.log(`✅ ${check.name}: 0 records`);
        }
      }
    } catch (error) {
      console.log(`⚠️  Could not check ${check.name}:`, error.message);
    }
  }

  console.log('\n💡 If there are related records, you may need to:');
  console.log('   1. Delete them manually first, or');
  console.log('   2. Add ON DELETE CASCADE to foreign key constraints');
}

// Run the deletion
deleteUser().catch(console.error);
