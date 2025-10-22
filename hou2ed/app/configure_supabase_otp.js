// Complete Supabase OTP Configuration Script
const https = require('https');
require('dotenv').config({ path: '.env.supabase' });

const PROJECT_REF = 'rixiofltzptwaiwxhhlf';
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || 'sbp_35b563bea5d4526a6d8fdd91debc5ddb9d180c03';

console.log('Using access token:', SUPABASE_ACCESS_TOKEN.substring(0, 10) + '...');

// Function to make API request
async function makeRequest(path, method, data) {
  return new Promise((resolve, reject) => {
    const dataStr = JSON.stringify(data);

    const options = {
      hostname: 'api.supabase.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        'Content-Length': Buffer.byteLength(dataStr)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        console.log(`Response from ${path}: Status ${res.statusCode}`);
        if (responseData) {
          try {
            const parsed = JSON.parse(responseData);
            console.log('Response data:', JSON.stringify(parsed, null, 2));
          } catch {
            console.log('Response data:', responseData);
          }
        }
        resolve({ status: res.statusCode, data: responseData });
      });
    });

    req.on('error', reject);
    req.write(dataStr);
    req.end();
  });
}

// Main configuration update
async function updateSupabaseConfig() {
  console.log('========================================');
  console.log('Configuring Supabase for OTP Authentication');
  console.log('========================================\n');

  // Step 1: Update Auth Configuration
  console.log('Step 1: Updating auth configuration...');
  const authConfig = {
    external_email_enabled: true,
    mailer_autoconfirm: false,
    sms_autoconfirm: false,
    phone_autoconfirm: false,
    enable_signup: true,
    enable_anonymous_sign_ins: false,
    site_url: 'hou2ed://auth-callback',
    mailer_otp_length: 6,
    mailer_otp_exp: 3600,
    email_otp_length: 6,
    sms_otp_length: 6,
    sms_otp_exp: 60,
    external_email_otp_enabled: true,
    disable_email_template: false
  };

  try {
    const authResult = await makeRequest(
      `/v1/projects/${PROJECT_REF}/config/auth`,
      'PATCH',
      authConfig
    );

    if (authResult.status === 200 || authResult.status === 204) {
      console.log('✓ Auth configuration updated successfully\n');
    } else {
      console.log('⚠ Auth configuration update returned status:', authResult.status, '\n');
    }
  } catch (error) {
    console.error('Error updating auth config:', error.message);
  }

  // Step 2: Try alternate email template configuration
  console.log('Step 2: Attempting to configure email settings...');
  const emailConfig = {
    email_auth_enabled: true,
    enable_confirmations: true,
    enable_email_signup: true,
    mailer_secure_email_change_enabled: true,
    mailer_otp_enabled: true,
    mailer_magic_link_enabled: false,
    use_otp: true,
    otp_length: 6,
    otp_expiry: 3600
  };

  try {
    const emailResult = await makeRequest(
      `/v1/projects/${PROJECT_REF}/config/auth/email`,
      'PATCH',
      emailConfig
    );

    if (emailResult.status === 200 || emailResult.status === 204) {
      console.log('✓ Email configuration updated successfully\n');
    } else {
      console.log('⚠ Email configuration update returned status:', emailResult.status, '\n');
    }
  } catch (error) {
    console.error('Note: Email endpoint not available:', error.message);
  }

  console.log('\n========================================');
  console.log('API Configuration Complete!');
  console.log('========================================\n');

  console.log('IMPORTANT MANUAL STEPS REQUIRED:\n');
  console.log('Since email templates must be updated in the Supabase Dashboard:');
  console.log('1. Open: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/auth/templates');
  console.log('2. Click on "Confirm signup" template');
  console.log('3. Change the template type from "Magic Link" to "OTP"');
  console.log('4. Use this template content:\n');

  const templateContent = `<h2>Welcome to HOU2ED!</h2>
<p>Your verification code is:</p>
<table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td align="center">
      <div style="background-color: #f4f4f4; padding: 20px; border-radius: 8px; display: inline-block; margin: 20px 0;">
        <h1 style="font-family: monospace; font-size: 36px; letter-spacing: 8px; color: #333; margin: 0;">
          {{ .Token }}
        </h1>
      </div>
    </td>
  </tr>
</table>
<p style="text-align: center; color: #666;">This code expires in 1 hour.</p>
<p style="text-align: center; color: #999; font-size: 12px;">If you didn't request this code, please ignore this email.</p>`;

  console.log(templateContent);
  console.log('\n5. Save the template');
  console.log('6. Test by signing up with a new email\n');

  console.log('Opening Supabase Dashboard now...');
}

// Execute the configuration
updateSupabaseConfig().then(() => {
  // Try to open the dashboard
  const { exec } = require('child_process');
  exec('open https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/auth/templates', (err) => {
    if (err) {
      console.log('\nPlease manually open the URL above to complete the configuration.');
    } else {
      console.log('\n✓ Dashboard opened in your browser');
    }
  });
}).catch(error => {
  console.error('Configuration failed:', error);
});