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

async function createDocumentsTable() {
  console.log('🔧 CREATING DOCUMENTS TABLE');
  console.log('='.repeat(60));
  console.log('');

  // Create the documents table
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS documents (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      file_url TEXT,
      file_name TEXT,
      file_size INTEGER,
      status TEXT DEFAULT 'uploaded',
      uploaded_by UUID REFERENCES auth.users(id),
      uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      verified_at TIMESTAMP WITH TIME ZONE,
      verified_by UUID REFERENCES auth.users(id),
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create indexes for better query performance
    CREATE INDEX IF NOT EXISTS idx_documents_application_id ON documents(application_id);
    CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
    CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
  `;

  console.log('Creating documents table...');
  const createResult = await executeSQL(createTableSQL);

  if (createResult && !createResult.error) {
    console.log('✅ Documents table created successfully');
  } else {
    console.log('❌ Failed to create documents table');
    return;
  }

  // Enable RLS
  const enableRLSSQL = `
    ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
  `;

  console.log('\nEnabling RLS on documents table...');
  const rlsResult = await executeSQL(enableRLSSQL);

  if (rlsResult && !rlsResult.error) {
    console.log('✅ RLS enabled on documents table');
  }

  // Create RLS policies
  console.log('\nCreating RLS policies...');

  // Policy 1: Seekers can view their own application documents
  const seekerViewSQL = `
    CREATE POLICY "Seekers can view their own application documents"
    ON documents FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM applications
        WHERE applications.id = documents.application_id
        AND applications.seeker_id = auth.uid()
      )
    );
  `;

  const seekerViewResult = await executeSQL(seekerViewSQL);
  if (seekerViewResult && !seekerViewResult.error) {
    console.log('✅ Created policy: Seekers can view their own documents');
  }

  // Policy 2: Seekers can insert documents for their own applications
  const seekerInsertSQL = `
    CREATE POLICY "Seekers can insert documents for their applications"
    ON documents FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM applications
        WHERE applications.id = documents.application_id
        AND applications.seeker_id = auth.uid()
      )
    );
  `;

  const seekerInsertResult = await executeSQL(seekerInsertSQL);
  if (seekerInsertResult && !seekerInsertResult.error) {
    console.log('✅ Created policy: Seekers can insert documents');
  }

  // Policy 3: Seekers can update their own documents
  const seekerUpdateSQL = `
    CREATE POLICY "Seekers can update their own documents"
    ON documents FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM applications
        WHERE applications.id = documents.application_id
        AND applications.seeker_id = auth.uid()
      )
    );
  `;

  const seekerUpdateResult = await executeSQL(seekerUpdateSQL);
  if (seekerUpdateResult && !seekerUpdateResult.error) {
    console.log('✅ Created policy: Seekers can update their documents');
  }

  // Policy 4: Providers can view documents for applications to their listings
  const providerViewSQL = `
    CREATE POLICY "Providers can view documents for their listing applications"
    ON documents FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM applications a
        JOIN listings l ON a.listing_id = l.id
        WHERE a.id = documents.application_id
        AND l.provider_id = auth.uid()
      )
    );
  `;

  const providerViewResult = await executeSQL(providerViewSQL);
  if (providerViewResult && !providerViewResult.error) {
    console.log('✅ Created policy: Providers can view documents');
  }

  // Policy 5: Providers can update document status (for verification)
  const providerUpdateSQL = `
    CREATE POLICY "Providers can update document status"
    ON documents FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM applications a
        JOIN listings l ON a.listing_id = l.id
        WHERE a.id = documents.application_id
        AND l.provider_id = auth.uid()
      )
    );
  `;

  const providerUpdateResult = await executeSQL(providerUpdateSQL);
  if (providerUpdateResult && !providerUpdateResult.error) {
    console.log('✅ Created policy: Providers can update document status');
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ DOCUMENTS TABLE SETUP COMPLETE');
  console.log('');
  console.log('The documents table has been created with:');
  console.log('- Proper foreign key relationships to applications');
  console.log('- RLS policies for seekers and providers');
  console.log('- Indexes for performance');
  console.log('');
  console.log('You can now upload documents with applications!');
}

createDocumentsTable().catch(console.error);