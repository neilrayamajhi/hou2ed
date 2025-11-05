const fetch = require('node-fetch');

async function verifySendGridSetup() {
  console.log('🔍 Verifying SendGrid Setup for Hou2ed');
  console.log('========================================\n');

  console.log('📧 Account Configuration:');
  console.log('  SendGrid Account: neilrayamajhi2008@gmail.com');
  console.log('  Sender Email: hou2eddirectory@gmail.com');
  console.log('  Recipient (you): neilrayamajhi2008@gmail.com\n');

  const apiKey = process.argv[2];

  if (!apiKey) {
    console.log('⚠️  Please provide your SendGrid API key');
    console.log('\n📝 How to get your SendGrid API key:');
    console.log('1. Go to Supabase Dashboard');
    console.log('2. Settings → Auth → SMTP Settings');
    console.log('3. Copy the "Password" field (it should start with "SG.")');
    console.log('\nThen run:');
    console.log('node verify-sendgrid-setup.js YOUR_SENDGRID_API_KEY\n');

    console.log('OR if you have SendGrid access:');
    console.log('1. Login to https://app.sendgrid.com/');
    console.log('2. Go to Settings → API Keys');
    console.log('3. Create or copy an existing API key');
    return;
  }

  if (!apiKey.startsWith('SG.')) {
    console.log('⚠️  Warning: SendGrid API keys usually start with "SG."');
    console.log('  Make sure you copied the full key\n');
  }

  try {
    // Test 1: Verify API key
    console.log('Test 1: Verifying API Key');
    console.log('-------------------------');
    const verifyResponse = await fetch('https://api.sendgrid.com/v3/user/profile', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!verifyResponse.ok) {
      console.log('❌ API Key is INVALID!');
      console.log('  Status:', verifyResponse.status);

      if (verifyResponse.status === 401) {
        console.log('\n🔧 Fix: You need a valid SendGrid API key');
        console.log('  1. Login to SendGrid: https://app.sendgrid.com/');
        console.log('  2. Go to Settings → API Keys');
        console.log('  3. Create a new API key with "Full Access"');
        console.log('  4. Copy the key immediately (you can\'t see it again)');
        console.log('  5. Update in Supabase: Settings → Auth → SMTP Settings → Password field');
      }
      return;
    }

    const profile = await verifyResponse.json();
    console.log('✅ API Key is VALID!');
    console.log('  Account email:', profile.email);
    console.log('  Account type:', profile.type || 'Free');

    // Test 2: Check verified senders
    console.log('\nTest 2: Checking Verified Senders');
    console.log('----------------------------------');
    const sendersResponse = await fetch('https://api.sendgrid.com/v3/verified_senders', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    let hou2edVerified = false;
    if (sendersResponse.ok) {
      const { results } = await sendersResponse.json();

      if (results && results.length > 0) {
        console.log('Verified senders:');
        results.forEach(sender => {
          const isHou2ed = sender.from_email === 'hou2eddirectory@gmail.com';
          const status = sender.verified ? '✅ Verified' : '⚠️ Pending';
          console.log(`  ${isHou2ed ? '→' : '•'} ${sender.from_email} - ${status}`);

          if (isHou2ed) {
            hou2edVerified = sender.verified;
          }
        });

        if (!results.find(s => s.from_email === 'hou2eddirectory@gmail.com')) {
          console.log('\n❌ hou2eddirectory@gmail.com is NOT added as a sender!');
        } else if (!hou2edVerified) {
          console.log('\n⚠️ hou2eddirectory@gmail.com is added but NOT VERIFIED!');
          console.log('  Check hou2eddirectory@gmail.com inbox for verification email');
        } else {
          console.log('\n✅ hou2eddirectory@gmail.com is verified and ready!');
        }
      } else {
        console.log('❌ No verified senders found!');
      }
    }

    // Test 3: Add hou2eddirectory if not exists
    if (!hou2edVerified) {
      console.log('\nTest 3: Adding hou2eddirectory@gmail.com as Verified Sender');
      console.log('------------------------------------------------------------');

      const addSenderResponse = await fetch('https://api.sendgrid.com/v3/verified_senders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nickname: 'Hou2ed Directory',
          from_email: 'hou2eddirectory@gmail.com',
          from_name: 'Hou2ed',
          reply_to: 'hou2eddirectory@gmail.com',
          reply_to_name: 'Hou2ed Support',
          address: '123 Main St',
          city: 'Your City',
          state: 'Your State',
          zip: '12345',
          country: 'United States'
        })
      });

      if (addSenderResponse.ok || addSenderResponse.status === 400) {
        if (addSenderResponse.status === 400) {
          const error = await addSenderResponse.json();
          if (error.errors?.[0]?.message?.includes('already exists')) {
            console.log('✅ Sender already exists (just needs verification)');
          } else {
            console.log('⚠️ Could not add sender:', error.errors?.[0]?.message);
          }
        } else {
          console.log('✅ Verification email sent to hou2eddirectory@gmail.com!');
        }

        console.log('\n📧 ACTION REQUIRED:');
        console.log('  1. Check hou2eddirectory@gmail.com inbox');
        console.log('  2. Look for email from SendGrid');
        console.log('  3. Click the verification link');
        console.log('  4. Then emails will work!');
      }
    }

    // Test 4: Send test email
    console.log('\nTest 4: Sending Test Email');
    console.log('--------------------------');

    if (!hou2edVerified) {
      console.log('⚠️ Skipping - need to verify sender first');
    } else {
      const testEmail = {
        personalizations: [{
          to: [{ email: 'neilrayamajhi2008@gmail.com' }]
        }],
        from: {
          email: 'hou2eddirectory@gmail.com',
          name: 'Hou2ed'
        },
        subject: 'Hou2ed - SendGrid Test Email',
        content: [{
          type: 'text/html',
          value: `
            <h2>SendGrid is Working! 🎉</h2>
            <p>This test email confirms that:</p>
            <ul>
              <li>✅ Your SendGrid API key is valid</li>
              <li>✅ hou2eddirectory@gmail.com is verified</li>
              <li>✅ Emails can be sent successfully</li>
            </ul>
            <p>Now update your Supabase SMTP settings with these exact values:</p>
            <ul>
              <li><b>Host:</b> smtp.sendgrid.net</li>
              <li><b>Port:</b> 587</li>
              <li><b>Username:</b> apikey</li>
              <li><b>Password:</b> [Your SendGrid API Key]</li>
              <li><b>Sender email:</b> hou2eddirectory@gmail.com</li>
            </ul>
          `
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
      } else {
        console.log('❌ Failed to send test email');
        console.log('  Status:', sendResponse.status);
        const error = await sendResponse.text();
        if (error) console.log('  Error:', error);
      }
    }

    // Summary and next steps
    console.log('\n' + '='.repeat(60));
    console.log('📊 SENDGRID CONFIGURATION SUMMARY');
    console.log('='.repeat(60));

    console.log('\nStatus:');
    console.log('  API Key: ✅ Valid');
    console.log('  Sender (hou2eddirectory@gmail.com):', hou2edVerified ? '✅ Verified' : '❌ Not Verified');

    if (hou2edVerified) {
      console.log('\n✅ SendGrid is ready! Now update Supabase:');
      console.log('\n1. Go to: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/settings/auth');
      console.log('2. Scroll to "SMTP Settings"');
      console.log('3. Make sure "Enable custom SMTP" is ON');
      console.log('4. Enter these EXACT values:');
      console.log('   Host: smtp.sendgrid.net');
      console.log('   Port: 587');
      console.log('   Username: apikey');
      console.log('   Password: ' + apiKey.substring(0, 10) + '...');
      console.log('   Sender email: hou2eddirectory@gmail.com');
      console.log('   Sender name: Hou2ed');
      console.log('5. Click "Save"');
      console.log('6. Click "Send test email" button to verify');
    } else {
      console.log('\n❌ Action Required:');
      console.log('1. Check hou2eddirectory@gmail.com for SendGrid verification email');
      console.log('2. Click the verification link');
      console.log('3. Run this script again to confirm');
      console.log('4. Then update Supabase SMTP settings');
    }

    console.log('\n💡 Common Issues:');
    console.log('• If no verification email: Check spam/junk folder');
    console.log('• If Supabase test fails: Double-check the username is exactly "apikey"');
    console.log('• If still not working: Try toggling "Enable custom SMTP" off and on');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\nMake sure you have internet connection and the API key is correct');
  }
}

verifySendGridSetup();