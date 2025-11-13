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

async function fixUniqueConstraint() {
  console.log('🔧 FIXING UNIQUE CONSTRAINT FOR SOFT DELETES');
  console.log('='.repeat(60));

  // First, check what applications exist
  console.log('\n1️⃣ Checking existing applications...');
  const checkSQL = `
    SELECT
      id,
      listing_id,
      seeker_id,
      status,
      deleted_at,
      created_at
    FROM applications
    ORDER BY created_at DESC;
  `;

  const checkResult = await executeSQL(checkSQL);
  if (checkResult && checkResult.length > 0) {
    console.log(`Found ${checkResult.length} applications:`);
    checkResult.forEach((app, index) => {
      const deletedStatus = app.deleted_at ? '❌ DELETED' : '✅ ACTIVE';
      console.log(`  ${index + 1}. ${deletedStatus} - Status: ${app.status}`);
      console.log(`     Seeker: ${app.seeker_id}`);
      console.log(`     Listing: ${app.listing_id}`);
      if (app.deleted_at) {
        console.log(`     Deleted at: ${app.deleted_at}`);
      }
    });
  }

  // Step 2: Drop the existing unique constraint
  console.log('\n2️⃣ Dropping old unique constraint...');
  const dropConstraintSQL = `
    ALTER TABLE applications
    DROP CONSTRAINT IF EXISTS applications_listing_id_seeker_id_key;
  `;

  const dropResult = await executeSQL(dropConstraintSQL);
  if (dropResult && !dropResult.error) {
    console.log('✅ Old unique constraint dropped');
  }

  // Step 3: Create a new partial unique index that only applies to non-deleted records
  console.log('\n3️⃣ Creating new partial unique index...');
  const createIndexSQL = `
    CREATE UNIQUE INDEX applications_listing_seeker_unique_active
    ON applications (listing_id, seeker_id)
    WHERE deleted_at IS NULL;
  `;

  const createResult = await executeSQL(createIndexSQL);
  if (createResult && !createResult.error) {
    console.log('✅ New partial unique index created');
    console.log('   This allows multiple applications after soft delete');
  }

  // Step 4: Verify the fix
  console.log('\n4️⃣ Verifying constraints...');
  const verifySQL = `
    SELECT
      schemaname,
      tablename,
      indexname,
      indexdef
    FROM pg_indexes
    WHERE tablename = 'applications'
    AND indexname LIKE '%unique%';
  `;

  const verifyResult = await executeSQL(verifySQL);
  if (verifyResult && verifyResult.length > 0) {
    console.log('Current unique indexes on applications table:');
    verifyResult.forEach(idx => {
      console.log(`  - ${idx.indexname}`);
      console.log(`    ${idx.indexdef}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ CONSTRAINT FIX COMPLETE');
  console.log('\nNOW YOU CAN:');
  console.log('  1. Delete an application (soft delete)');
  console.log('  2. Apply to the same listing again');
  console.log('  3. The unique constraint only applies to active applications');
}

fixUniqueConstraint().catch(console.error);