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

  // Get all applications
  const appsSQL = `
    SELECT
      a.id,
      a.listing_id,
      a.seeker_id,
      a.status,
      a.created_at,
      a.deleted_at,
      l.title as listing_title,
      p.email as seeker_email
    FROM applications a
    LEFT JOIN listings l ON a.listing_id = l.id
    LEFT JOIN profiles p ON a.seeker_id = p.id
    ORDER BY a.created_at DESC;
  `;

  const result = await executeSQL(appsSQL);

  if (result && result.length > 0) {
    console.log(`\nFound ${result.length} applications:\n`);

    result.forEach((app, index) => {
      console.log(`Application ${index + 1}:`);
      console.log(`  ID: ${app.id}`);
      console.log(`  Listing: ${app.listing_title || app.listing_id}`);
      console.log(`  Seeker: ${app.seeker_email || app.seeker_id}`);
      console.log(`  Status: ${app.status}`);
      console.log(`  Created: ${new Date(app.created_at).toLocaleString()}`);
      console.log(`  Deleted: ${app.deleted_at || 'Not deleted'}`);

      if (app.deleted_at) {
        console.log(`  ⚠️ This application is marked as deleted but still in database`);
      }
      console.log('-'.repeat(40));
    });
  } else {
    console.log('No applications found in database');
  }

  // Check for duplicate applications (same seeker, same listing)
  console.log('\n' + '='.repeat(60));
  console.log('CHECKING FOR DUPLICATES:');

  const duplicatesSQL = `
    SELECT
      seeker_id,
      listing_id,
      COUNT(*) as count,
      array_agg(id) as application_ids,
      array_agg(status) as statuses,
      array_agg(created_at ORDER BY created_at) as created_dates
    FROM applications
    WHERE deleted_at IS NULL
    GROUP BY seeker_id, listing_id
    HAVING COUNT(*) > 1;
  `;

  const dupResult = await executeSQL(duplicatesSQL);

  if (dupResult && dupResult.length > 0) {
    console.log(`\n⚠️ Found ${dupResult.length} duplicate application sets:\n`);
    dupResult.forEach((dup, index) => {
      console.log(`Duplicate Set ${index + 1}:`);
      console.log(`  Seeker: ${dup.seeker_id}`);
      console.log(`  Listing: ${dup.listing_id}`);
      console.log(`  Count: ${dup.count} applications`);
      console.log(`  IDs: ${dup.application_ids.join(', ')}`);
      console.log(`  Statuses: ${dup.statuses.join(', ')}`);
      console.log('-'.repeat(40));
    });
  } else {
    console.log('✅ No duplicate applications found');
  }

  // Check unique constraint
  console.log('\n' + '='.repeat(60));
  console.log('CHECKING UNIQUE CONSTRAINT:');

  const constraintSQL = `
    SELECT
      conname as constraint_name,
      pg_get_constraintdef(oid) as definition
    FROM pg_constraint
    WHERE conrelid = 'applications'::regclass
    AND contype = 'u';
  `;

  const constraintResult = await executeSQL(constraintSQL);

  if (constraintResult && constraintResult.length > 0) {
    console.log('Unique constraints on applications table:');
    constraintResult.forEach(con => {
      console.log(`  - ${con.constraint_name}: ${con.definition}`);
    });
  } else {
    console.log('⚠️ No unique constraints found on applications table');
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ CHECK COMPLETE');
}

checkApplications().catch(console.error);