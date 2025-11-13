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

async function setupStorageBucket() {
  console.log('🚀 SETTING UP STORAGE BUCKET FOR APPLICATION DOCUMENTS');
  console.log('='.repeat(60));
  console.log('');

  // Create the bucket
  const createBucketSQL = `
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'application-documents',
      'application-documents',
      false,
      10485760,
      ARRAY[
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]::text[]
    )
    ON CONFLICT (id) DO UPDATE
    SET
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
  `;

  console.log('Creating storage bucket...');
  const bucketResult = await executeSQL(createBucketSQL);

  if (bucketResult && !bucketResult.error) {
    console.log('✅ Bucket "application-documents" created/updated successfully');
  } else {
    console.log('⚠️ Issue with bucket creation (may already exist)');
  }

  // Create RLS policies for the bucket
  console.log('\nSetting up storage RLS policies...');

  // Policy 1: Allow authenticated users to upload
  const uploadPolicySQL = `
    CREATE POLICY "Users can upload documents" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'application-documents');
  `;

  const uploadResult = await executeSQL(uploadPolicySQL);
  if (uploadResult && !uploadResult.error) {
    console.log('✅ Upload policy created');
  }

  // Policy 2: Allow users to view their own documents
  const viewOwnPolicySQL = `
    CREATE POLICY "Users can view own documents" ON storage.objects
    FOR SELECT TO authenticated
    USING (
      bucket_id = 'application-documents'
      AND auth.uid()::text = (string_to_array(name, '/'))[1]
    );
  `;

  const viewOwnResult = await executeSQL(viewOwnPolicySQL);
  if (viewOwnResult && !viewOwnResult.error) {
    console.log('✅ View own documents policy created');
  }

  // Policy 3: Allow providers to view documents for their applications
  const providerViewSQL = `
    CREATE POLICY "Providers can view application documents" ON storage.objects
    FOR SELECT TO authenticated
    USING (
      bucket_id = 'application-documents'
      AND EXISTS (
        SELECT 1 FROM applications a
        JOIN listings l ON a.listing_id = l.id
        WHERE l.provider_id = auth.uid()
        AND (string_to_array(name, '/'))[2] = a.id::text
      )
    );
  `;

  const providerResult = await executeSQL(providerViewSQL);
  if (providerResult && !providerResult.error) {
    console.log('✅ Provider view policy created');
  }

  // Policy 4: Allow users to update their own documents
  const updatePolicySQL = `
    CREATE POLICY "Users can update own documents" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
      bucket_id = 'application-documents'
      AND auth.uid()::text = (string_to_array(name, '/'))[1]
    );
  `;

  const updateResult = await executeSQL(updatePolicySQL);
  if (updateResult && !updateResult.error) {
    console.log('✅ Update policy created');
  }

  // Policy 5: Allow users to delete their own documents
  const deletePolicySQL = `
    CREATE POLICY "Users can delete own documents" ON storage.objects
    FOR DELETE TO authenticated
    USING (
      bucket_id = 'application-documents'
      AND auth.uid()::text = (string_to_array(name, '/'))[1]
    );
  `;

  const deleteResult = await executeSQL(deletePolicySQL);
  if (deleteResult && !deleteResult.error) {
    console.log('✅ Delete policy created');
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ STORAGE SETUP COMPLETE!');
  console.log('');
  console.log('📁 Bucket: application-documents');
  console.log('🔒 Type: Private (requires authentication)');
  console.log('📏 Max file size: 10MB');
  console.log('📄 Allowed: Images (JPEG, PNG, GIF, WebP), PDF, Word docs');
  console.log('');
  console.log('Ready for document uploads!');
}

setupStorageBucket().catch(console.error);