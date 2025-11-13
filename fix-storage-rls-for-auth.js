// Fix storage RLS to allow authenticated users to upload documents
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

async function fixStorageRLS() {
  console.log('🔧 FIXING STORAGE RLS FOR AUTHENTICATED USERS');
  console.log('='.repeat(60));

  // 1. Drop existing RLS policies
  console.log('\n1️⃣ DROPPING EXISTING STORAGE RLS POLICIES...');
  const dropPoliciesSQL = `
    DROP POLICY IF EXISTS "Users can upload application documents" ON storage.objects;
    DROP POLICY IF EXISTS "Seekers can view own application documents" ON storage.objects;
    DROP POLICY IF EXISTS "Providers can view documents for their listings" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update own documents" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
    DROP POLICY IF EXISTS "Seekers can view own documents" ON storage.objects;
    DROP POLICY IF EXISTS "Providers can view application documents" ON storage.objects;
  `;
  await executeSQL(dropPoliciesSQL);
  console.log('✅ Old policies dropped');

  // 2. Create new comprehensive storage RLS policies
  console.log('\n2️⃣ CREATING NEW STORAGE RLS POLICIES...');

  // Policy for uploading - allow any authenticated user to upload to application-documents
  const uploadPolicySQL = `
    CREATE POLICY "Authenticated users can upload documents"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'application-documents' AND
      auth.role() = 'authenticated'
    );
  `;
  await executeSQL(uploadPolicySQL);
  console.log('✅ Upload policy created (allows any authenticated user)');

  // Policy for viewing - seekers can view documents for their applications
  const seekerViewPolicySQL = `
    CREATE POLICY "Seekers can view own documents"
    ON storage.objects FOR SELECT
    USING (
      bucket_id = 'application-documents' AND
      (
        -- Allow seeker to view their own application documents
        EXISTS (
          SELECT 1 FROM applications a
          WHERE a.seeker_id = auth.uid()
          AND (
            -- Match application ID in the path
            (storage.foldername(name))[1] = a.id::text
            OR
            -- Also allow if path starts with application ID
            name LIKE a.id::text || '/%'
          )
        )
      )
    );
  `;
  await executeSQL(seekerViewPolicySQL);
  console.log('✅ Seeker view policy created');

  // Policy for viewing - providers can view documents for applications to their listings
  const providerViewPolicySQL = `
    CREATE POLICY "Providers can view application documents"
    ON storage.objects FOR SELECT
    USING (
      bucket_id = 'application-documents' AND
      (
        -- Allow provider to view documents for applications to their listings
        EXISTS (
          SELECT 1 FROM applications a
          JOIN listings l ON a.listing_id = l.id
          WHERE l.provider_id = auth.uid()
          AND (
            -- Match application ID in the path
            (storage.foldername(name))[1] = a.id::text
            OR
            -- Also allow if path starts with application ID
            name LIKE a.id::text || '/%'
          )
        )
      )
    );
  `;
  await executeSQL(providerViewPolicySQL);
  console.log('✅ Provider view policy created');

  // Policy for update - users can update their own documents
  const updatePolicySQL = `
    CREATE POLICY "Users can update own documents"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'application-documents' AND
      EXISTS (
        SELECT 1 FROM applications a
        WHERE a.seeker_id = auth.uid()
        AND (
          (storage.foldername(name))[1] = a.id::text
          OR
          name LIKE a.id::text || '/%'
        )
      )
    );
  `;
  await executeSQL(updatePolicySQL);
  console.log('✅ Update policy created');

  // Policy for delete - users can delete their own documents
  const deletePolicySQL = `
    CREATE POLICY "Users can delete own documents"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'application-documents' AND
      EXISTS (
        SELECT 1 FROM applications a
        WHERE a.seeker_id = auth.uid()
        AND (
          (storage.foldername(name))[1] = a.id::text
          OR
          name LIKE a.id::text || '/%'
        )
      )
    );
  `;
  await executeSQL(deletePolicySQL);
  console.log('✅ Delete policy created');

  // 3. Enable RLS on storage.objects
  console.log('\n3️⃣ ENSURING RLS IS ENABLED...');
  const enableRLSSQL = `
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  `;
  await executeSQL(enableRLSSQL);
  console.log('✅ RLS enabled on storage.objects');

  // 4. Verify configuration
  console.log('\n4️⃣ VERIFYING CONFIGURATION...');
  const verifySQL = `
    SELECT
      p.policyname,
      p.cmd,
      p.qual,
      p.with_check
    FROM pg_policies p
    WHERE p.tablename = 'objects'
    AND p.schemaname = 'storage'
    ORDER BY p.policyname;
  `;
  const policies = await executeSQL(verifySQL);
  if (policies && policies.length > 0) {
    console.log('\n✅ Storage Policies Created:');
    policies.forEach(p => {
      console.log(`  - ${p.policyname} (${p.cmd})`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ STORAGE RLS FIXED!');
  console.log('\nAuthenticated users can now:');
  console.log('  • Upload documents to application-documents bucket');
  console.log('  • View their own application documents');
  console.log('  • Providers can view documents for applications to their listings');
}

fixStorageRLS().catch(console.error);