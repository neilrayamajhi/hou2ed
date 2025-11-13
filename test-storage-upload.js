// Test script to verify storage upload actually works
const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

// Use hardcoded URL since it's not in .env.local
const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;

console.log('🔧 TESTING STORAGE UPLOAD');
console.log('='.repeat(60));
console.log('Environment variables loaded:');
console.log(`  SUPABASE_URL: ${SUPABASE_URL ? '✅' : '❌'}`);
console.log(`  SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY ? '✅' : '❌'}`);
console.log(`  SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌'}`);
console.log(`  PROJECT_REF: ${PROJECT_REF ? '✅' : '❌'}`);

async function testUpload() {
  // Create a simple test file content
  const testContent = Buffer.from('This is a test document upload at ' + new Date().toISOString());
  const fileName = `test_${Date.now()}.txt`;
  const filePath = `test/${fileName}`;

  console.log('\n1️⃣ TESTING WITH SERVICE ROLE KEY...');
  console.log(`  Uploading to: ${filePath}`);
  console.log(`  Content size: ${testContent.length} bytes`);

  try {
    // Try with service role key first
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/application-documents/${filePath}`;
    console.log(`  Upload URL: ${uploadUrl}`);

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'text/plain',
        'x-upsert': 'false'
      },
      body: testContent
    });

    const responseText = await response.text();
    console.log(`  Response status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      try {
        const result = JSON.parse(responseText);
        console.log('  ✅ Upload successful!');
        console.log(`  Response:`, result);

        // Now try to list files to verify it was saved
        console.log('\n2️⃣ VERIFYING FILE WAS SAVED...');
        const listUrl = `${SUPABASE_URL}/storage/v1/object/list/application-documents`;
        const listResponse = await fetch(listUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            prefix: 'test/',
            limit: 10
          })
        });

        const files = await listResponse.json();
        const uploadedFile = files.find(f => f.name === filePath);
        if (uploadedFile) {
          console.log('  ✅ File found in storage!');
          console.log(`  File details:`, uploadedFile);
        } else {
          console.log('  ❌ File not found in storage listing');
          console.log('  Files in test/ folder:', files.map(f => f.name));
        }

        // Try to download the file
        console.log('\n3️⃣ TESTING DOWNLOAD...');
        const downloadUrl = `${SUPABASE_URL}/storage/v1/object/authenticated/application-documents/${filePath}`;
        const downloadResponse = await fetch(downloadUrl, {
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': SUPABASE_SERVICE_ROLE_KEY
          }
        });

        if (downloadResponse.ok) {
          const content = await downloadResponse.text();
          console.log('  ✅ File downloaded successfully!');
          console.log(`  Content: ${content}`);
        } else {
          console.log('  ❌ Download failed:', downloadResponse.status, downloadResponse.statusText);
        }

      } catch (e) {
        console.log('  Response body:', responseText);
      }
    } else {
      console.log('  ❌ Upload failed!');
      console.log('  Response body:', responseText);
    }
  } catch (error) {
    console.error('  ❌ Error:', error.message);
  }

  // Now test with anon key (should fail due to RLS)
  console.log('\n4️⃣ TESTING WITH ANON KEY (should fail due to RLS)...');
  try {
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/application-documents/test/anon_test.txt`;
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'text/plain',
        'x-upsert': 'false'
      },
      body: Buffer.from('Test with anon key')
    });

    const responseText = await response.text();
    if (response.ok) {
      console.log('  ⚠️ Upload with anon key succeeded (unexpected!)');
    } else {
      console.log('  ✅ Upload with anon key failed as expected (RLS working)');
      console.log(`  Response: ${response.status} - ${responseText.substring(0, 100)}...`);
    }
  } catch (error) {
    console.log('  Error with anon key:', error.message);
  }
}

testUpload().then(() => {
  console.log('\n' + '='.repeat(60));
  console.log('✅ TEST COMPLETE');
}).catch(console.error);