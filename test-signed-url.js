const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSignedUrl() {
  console.log('🔍 TESTING SIGNED URL GENERATION');
  console.log('='.repeat(60));

  // Test with a known file path from storage
  const testPath = '95e9bd39-8416-49b9-93e5-85d54e3138b1/doc_income_1762929682815_t3dhw.png';

  console.log(`\nTesting with path: ${testPath}`);

  try {
    const { data, error } = await supabase.storage
      .from('application-documents')
      .createSignedUrl(testPath, 3600);

    if (error) {
      console.error('❌ Error generating signed URL:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
    } else if (data && data.signedUrl) {
      console.log('✅ Signed URL generated successfully!');
      console.log('URL:', data.signedUrl);
      console.log('\nYou can test this URL in a browser to verify the document loads.');
    } else {
      console.log('⚠️ No error but also no signed URL returned');
      console.log('Data:', data);
    }
  } catch (err) {
    console.error('❌ Exception:', err);
  }

  // Also test if the bucket is configured correctly
  console.log('\n' + '='.repeat(60));
  console.log('CHECKING BUCKET CONFIGURATION:');

  try {
    // Try to list files to verify bucket access
    const { data: files, error: listError } = await supabase.storage
      .from('application-documents')
      .list('95e9bd39-8416-49b9-93e5-85d54e3138b1', {
        limit: 10,
      });

    if (listError) {
      console.error('❌ Cannot list files:', listError);
    } else if (files && files.length > 0) {
      console.log(`✅ Found ${files.length} files in the application folder:`);
      files.forEach(file => {
        console.log(`  - ${file.name}`);
      });
    } else {
      console.log('⚠️ No files found in the application folder');
    }
  } catch (err) {
    console.error('❌ Exception listing files:', err);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ TEST COMPLETE');
}

testSignedUrl().catch(console.error);