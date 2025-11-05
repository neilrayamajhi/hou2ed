const fetch = require('node-fetch');

async function testSendGridDirect() {
  console.log('🔍 Testing SendGrid API Key Directly');
  console.log('=====================================\n');

  // The API key would be in your Supabase SMTP password field
  // Since it starts with "SG." it's a SendGrid API key
  console.log('📝 Instructions to get your SendGrid API key:');
  console.log('1. Go to Supabase Dashboard');
  console.log('2. Navigate to Settings → Auth → SMTP Settings');
  console.log('3. Copy the password field (it should start with "SG.")');
  console.log('4. Run this test with: node test-sendgrid-direct.js YOUR_SENDGRID_API_KEY\n');

  const apiKey = process.argv[2];

  if (!apiKey) {
    console.log('⚠️  Please provide your SendGrid API key as an argument');
    console.log('Usage: node test-sendgrid-direct.js SG.your_actual_api_key_here');
    return;
  }

  if (!apiKey.startsWith('SG.')) {
    console.log('⚠️  Warning: SendGrid API keys usually start with "SG."');
  }

  try {
    // Test 1: Verify API key is valid
    console.log('Test 1: Verifying API Key');
    console.log('-------------------------');
    const verifyResponse = await fetch('https://api.sendgrid.com/v3/user/profile', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (verifyResponse.ok) {
      const profile = await verifyResponse.json();
      console.log('✅ API Key is VALID!');
      console.log('  Account type:', profile.type || 'Standard');
      console.log('  Email:', profile.email || 'N/A');
    } else {
      console.log('❌ API Key is INVALID or expired');
      console.log('  Status:', verifyResponse.status);
      const error = await verifyResponse.text();
      console.log('  Error:', error);
      return;
    }

    // Test 2: Check sender authentication
    console.log('\nTest 2: Checking Sender Authentication');
    console.log('---------------------------------------');
    const sendersResponse = await fetch('https://api.sendgrid.com/v3/verified_senders', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (sendersResponse.ok) {
      const { results } = await sendersResponse.json();
      if (results && results.length > 0) {
        console.log('✅ Verified senders found:');
        results.forEach(sender => {
          console.log(`  • ${sender.from_email} (${sender.from_name})`);
          console.log(`    Status: ${sender.verified ? '✅ Verified' : '❌ Not Verified'}`);
        });

        const hou2edSender = results.find(s => s.from_email === 'hou2eddirectory@gmail.com');
        if (!hou2edSender) {
          console.log('\n❌ WARNING: hou2eddirectory@gmail.com is NOT in verified senders!');
          console.log('  This email must be verified in SendGrid to send emails');
        } else if (!hou2edSender.verified) {
          console.log('\n❌ WARNING: hou2eddirectory@gmail.com is NOT VERIFIED!');
          console.log('  Check your email for verification link from SendGrid');
        }
      } else {
        console.log('❌ No verified senders found!');
        console.log('  You need to verify at least one sender email in SendGrid');
      }
    }

    // Test 3: Check account limits
    console.log('\nTest 3: Checking Account Status');
    console.log('--------------------------------');
    const statsResponse = await fetch('https://api.sendgrid.com/v3/user/credits', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (statsResponse.ok) {
      const credits = await statsResponse.json();
      console.log('Account credits:', credits);
    }

    // Test 4: Send a test email
    console.log('\nTest 4: Sending Test Email');
    console.log('--------------------------');
    const testEmail = {
      personalizations: [{
        to: [{ email: 'neilrayamajhi2008@gmail.com' }]
      }],
      from: { email: 'hou2eddirectory@gmail.com', name: 'Hou2ed' },
      subject: 'Hou2ed Test Email - SMTP Configuration',
      content: [{
        type: 'text/plain',
        value: 'This is a test email from Hou2ed to verify SendGrid is working.\n\nIf you receive this, your SendGrid API key is valid and working!'
      }]
    };

    const sendResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testEmail)
    });

    if (sendResponse.status === 202) {
      console.log('✅ Test email sent successfully!');
      console.log('  Check neilrayamajhi2008@gmail.com inbox');
      console.log('  Message ID:', sendResponse.headers.get('x-message-id'));
    } else {
      console.log('❌ Failed to send test email');
      console.log('  Status:', sendResponse.status);
      const error = await sendResponse.text();
      console.log('  Error:', error);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SENDGRID CONFIGURATION SUMMARY');
    console.log('='.repeat(60));

    console.log('\nSendGrid API Key: ' + (verifyResponse.ok ? '✅ VALID' : '❌ INVALID'));
    console.log('Test Email: ' + (sendResponse.status === 202 ? '✅ SENT' : '❌ FAILED'));

    console.log('\n🔧 NEXT STEPS:');
    if (verifyResponse.ok && sendResponse.status === 202) {
      console.log('1. ✅ Your SendGrid is working!');
      console.log('2. The issue is with Supabase-SendGrid integration');
      console.log('3. Double-check in Supabase dashboard:');
      console.log('   • SMTP Host: smtp.sendgrid.net');
      console.log('   • Port: 587');
      console.log('   • Username: apikey (exactly this word)');
      console.log('   • Password: Your SendGrid API key');
      console.log('   • Sender email: hou2eddirectory@gmail.com');
      console.log('4. Click "Send test email" in Supabase dashboard');
    } else {
      console.log('1. Fix the issues identified above');
      console.log('2. Verify sender email in SendGrid if needed');
      console.log('3. Generate a new API key if current one is invalid');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testSendGridDirect();