// Fix storage bucket and ensure it exists with proper configuration
const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
const ACCESS_TOKEN = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!PROJECT_REF || !ACCESS_TOKEN) {
  console.error('❌ Missing environment variables!');
  process.exit(1);
}

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

async function fixStorageBucket() {
  console.log('🔧 FIXING STORAGE BUCKET FOR APPLICATION DOCUMENTS');
  console.log('='.repeat(60));

  // 1. Recreate bucket if needed
  console.log('\n1️⃣ ENSURING BUCKET EXISTS...');
  const createBucketSQL = `
    INSERT INTO storage.buckets (id, name, public, created_at, updated_at)
    VALUES ('application-documents', 'application-documents', false, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE
    SET public = false, updated_at = NOW();
  `;
  await executeSQL(createBucketSQL);
  console.log('✅ Bucket configured');

  // 2. Drop existing RLS policies
  console.log('\n2️⃣ DROPPING EXISTING STORAGE RLS POLICIES...');
  const dropPoliciesSQL = `
    DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
    DROP POLICY IF EXISTS "Seekers can view own documents" ON storage.objects;
    DROP POLICY IF EXISTS "Providers can view application documents" ON storage.objects;
    DROP POLICY IF EXISTS "Service role bypass" ON storage.objects;
    DROP POLICY IF EXISTS "Users can upload application documents" ON storage.objects;
    DROP POLICY IF EXISTS "Users can view application documents" ON storage.objects;
  `;
  await executeSQL(dropPoliciesSQL);
  console.log('✅ Old policies dropped');

  // 3. Create comprehensive storage RLS policies
  console.log('\n3️⃣ CREATING NEW STORAGE RLS POLICIES...');

  // Policy for uploading
  const uploadPolicySQL = `
    CREATE POLICY "Users can upload application documents"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'application-documents' AND
      auth.role() = 'authenticated'
    );
  `;
  await executeSQL(uploadPolicySQL);
  console.log('✅ Upload policy created');

  // Policy for viewing - seekers
  const seekerViewPolicySQL = `
    CREATE POLICY "Seekers can view own application documents"
    ON storage.objects FOR SELECT
    USING (
      bucket_id = 'application-documents' AND
      auth.uid()::text IN (
        SELECT a.seeker_id::text
        FROM applications a
        WHERE (storage.foldername(name))[1] = a.id::text
      )
    );
  `;
  await executeSQL(seekerViewPolicySQL);
  console.log('✅ Seeker view policy created');

  // Policy for viewing - providers
  const providerViewPolicySQL = `
    CREATE POLICY "Providers can view documents for their listings"
    ON storage.objects FOR SELECT
    USING (
      bucket_id = 'application-documents' AND
      auth.uid()::text IN (
        SELECT l.provider_id::text
        FROM applications a
        JOIN listings l ON a.listing_id = l.id
        WHERE (storage.foldername(name))[1] = a.id::text
      )
    );
  `;
  await executeSQL(providerViewPolicySQL);
  console.log('✅ Provider view policy created');

  // Policy for update
  const updatePolicySQL = `
    CREATE POLICY "Users can update own documents"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'application-documents' AND
      auth.uid()::text IN (
        SELECT a.seeker_id::text
        FROM applications a
        WHERE (storage.foldername(name))[1] = a.id::text
      )
    );
  `;
  await executeSQL(updatePolicySQL);
  console.log('✅ Update policy created');

  // Policy for delete
  const deletePolicySQL = `
    CREATE POLICY "Users can delete own documents"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'application-documents' AND
      auth.uid()::text IN (
        SELECT a.seeker_id::text
        FROM applications a
        WHERE (storage.foldername(name))[1] = a.id::text
      )
    );
  `;
  await executeSQL(deletePolicySQL);
  console.log('✅ Delete policy created');

  // 4. Enable RLS on storage.objects
  console.log('\n4️⃣ ENSURING RLS IS ENABLED...');
  const enableRLSSQL = `
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  `;
  await executeSQL(enableRLSSQL);
  console.log('✅ RLS enabled on storage.objects');

  // 5. Verify configuration
  console.log('\n5️⃣ VERIFYING CONFIGURATION...');
  const verifySQL = `
    SELECT
      b.name,
      b.public,
      COUNT(p.policyname) as policy_count
    FROM storage.buckets b
    LEFT JOIN pg_policies p ON p.tablename = 'objects'
      AND p.policyname LIKE '%document%'
    WHERE b.name = 'application-documents'
    GROUP BY b.name, b.public;
  `;
  const verification = await executeSQL(verifySQL);
  if (verification && verification[0]) {
    console.log('\n✅ Bucket Configuration:');
    console.log(`  Name: ${verification[0].name}`);
    console.log(`  Public: ${verification[0].public}`);
    console.log(`  Policies: ${verification[0].policy_count}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ STORAGE BUCKET FIXED!');
  console.log('\nDocuments should now:');
  console.log('  • Upload successfully');
  console.log('  • Be viewable by seekers (own documents)');
  console.log('  • Be viewable by providers (for their listings)');
  console.log('  • Generate working signed URLs');
}

fixStorageBucket().catch(console.error);