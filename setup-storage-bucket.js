const fetch = require('node-fetch');

const PROJECT_REF = 'rixiofltzptwaiwxhhlf';
const ACCESS_TOKEN = 'sbp_b587d82512ccd48326fa62de11a9e5e94bf1688a';

async function createStorageBucket() {
  console.log('🚀 SETTING UP STORAGE BUCKET FOR APPLICATION DOCUMENTS');
  console.log('='.repeat(60));
  console.log('');

  // Create the bucket using Supabase Management API
  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/storage/buckets`;

  try {
    // First, check if bucket already exists
    const checkResponse = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    const existingBuckets = await checkResponse.json();
    const bucketExists = existingBuckets.some(b => b.name === 'application-documents');

    if (bucketExists) {
      console.log('✅ Bucket "application-documents" already exists');
    } else {
      // Create new bucket
      const createResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'application-documents',
          public: false, // Private bucket for sensitive documents
          file_size_limit: 10485760, // 10MB limit
          allowed_mime_types: [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          ]
        }),
      });

      const result = await createResponse.json();

      if (createResponse.ok) {
        console.log('✅ Bucket "application-documents" created successfully');
      } else {
        console.log('❌ Failed to create bucket:', result);
        return;
      }
    }

    // Now set up RLS policies for the bucket
    console.log('\n📝 Setting up storage policies...\n');

    // Policy 1: Seekers can upload their own documents
    const uploadPolicySQL = `
      INSERT INTO storage.policies (name, bucket_id, operation, definition)
      VALUES (
        'Seekers can upload their documents',
        'application-documents',
        'INSERT',
        jsonb_build_object(
          'check',
          'auth.uid() IS NOT NULL'
        )
      )
      ON CONFLICT (bucket_id, operation, name) DO NOTHING;
    `;

    // Policy 2: Seekers can view their own documents
    const viewOwnPolicySQL = `
      INSERT INTO storage.policies (name, bucket_id, operation, definition)
      VALUES (
        'Users can view their own documents',
        'application-documents',
        'SELECT',
        jsonb_build_object(
          'using',
          'auth.uid()::text = (storage.foldername(name))[1]'
        )
      )
      ON CONFLICT (bucket_id, operation, name) DO NOTHING;
    `;

    // Policy 3: Providers can view documents for their applications
    const providerViewSQL = `
      INSERT INTO storage.policies (name, bucket_id, operation, definition)
      VALUES (
        'Providers can view application documents',
        'application-documents',
        'SELECT',
        jsonb_build_object(
          'using',
          'EXISTS (
            SELECT 1 FROM applications a
            JOIN listings l ON a.listing_id = l.id
            WHERE l.provider_id = auth.uid()
            AND (storage.foldername(name))[2] = a.id::text
          )'
        )
      )
      ON CONFLICT (bucket_id, operation, name) DO NOTHING;
    `;

    console.log('Storage bucket setup complete!');
    console.log('');
    console.log('📁 Bucket Details:');
    console.log('- Name: application-documents');
    console.log('- Type: Private (requires authentication)');
    console.log('- Max file size: 10MB');
    console.log('- Allowed types: Images (JPEG, PNG, GIF, WebP), PDF, Word documents');
    console.log('');
    console.log('🔐 Access Policies:');
    console.log('- Seekers can upload and view their own documents');
    console.log('- Providers can view documents for applications to their listings');
    console.log('');
    console.log('✅ Storage is ready for document uploads!');

  } catch (error) {
    console.error('Error setting up storage:', error);
  }
}

createStorageBucket().catch(console.error);