const fetch = require('node-fetch');

const PROJECT_REF = 'rixiofltzptwaiwxhhlf';
const SERVICE_KEY = 'sbp_b587d82512ccd48326fa62de11a9e5e94bf1688a';

async function testStorageAccess() {
  console.log('🔍 TESTING STORAGE ACCESS WITH SERVICE KEY');
  console.log('='.repeat(60));

  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/storage/buckets/application-documents/objects`;

  try {
    console.log('\nListing all objects in bucket...');
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (response.ok) {
      if (result && result.length > 0) {
        console.log(`✅ Found ${result.length} objects:`);
        result.forEach((obj, index) => {
          console.log(`  ${index + 1}. ${obj.name}`);
          console.log(`     Size: ${obj.metadata?.size || 'unknown'} bytes`);
          console.log(`     Type: ${obj.metadata?.mimetype || 'unknown'}`);
        });
      } else {
        console.log('⚠️ Bucket is empty or no objects returned');
      }
    } else {
      console.log('❌ Failed to list objects:', result);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }

  // Try to actually download a file
  console.log('\n' + '='.repeat(60));
  console.log('TRYING TO DOWNLOAD A SPECIFIC FILE:');

  const testPath = '95e9bd39-8416-49b9-93e5-85d54e3138b1/doc_income_1762929682815_t3dhw.png';
  const downloadUrl = `https://rixiofltzptwaiwxhhlf.supabase.co/storage/v1/object/application-documents/${testPath}`;

  try {
    console.log(`\nDownloading: ${testPath}`);
    const response = await fetch(downloadUrl, {
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
    });

    if (response.ok) {
      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');
      console.log('✅ File exists and is accessible!');
      console.log(`  Content Type: ${contentType}`);
      console.log(`  Size: ${contentLength} bytes`);
    } else {
      console.log(`❌ Cannot download file: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.log('Response:', text);
    }
  } catch (error) {
    console.error('❌ Download error:', error);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ TEST COMPLETE');
}

testStorageAccess().catch(console.error);