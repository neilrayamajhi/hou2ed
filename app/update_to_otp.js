// Script to update Supabase to use OTP codes instead of magic links
const https = require('https');
require('dotenv').config({ path: '.env.supabase' });

const PROJECT_REF = 'rixiofltzptwaiwxhhlf';
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!SUPABASE_ACCESS_TOKEN) {
  console.error('Error: SUPABASE_ACCESS_TOKEN not found in .env.supabase');
  process.exit(1);
}

// Update auth configuration to use OTP
async function updateAuthConfig() {
  return new Promise((resolve, reject) => {
    const authData = JSON.stringify({
      email_auth_enabled: true,
      email_confirmations: true,
      otp_expiry: 3600, // 1 hour
      enable_email_otp: true,
      disable_magic_link: true
    });

    const options = {
      hostname: 'api.supabase.com',
      port: 443,
      path: `/v1/projects/${PROJECT_REF}/config/auth`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        'Content-Length': authData.length
      }
    };

    console.log('Updating auth configuration to enable OTP...');

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201 || res.statusCode === 204) {
          console.log('✓ Auth configuration updated successfully');
          resolve(data);
        } else {
          console.error(`Error: Status ${res.statusCode}`);
          console.error('Response:', data);
          reject(new Error(`Failed with status ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.write(authData);
    req.end();
  });
}

// Update email templates to use OTP
async function updateEmailTemplates() {
  const templates = [
    {
      type: 'signup',
      subject: 'Your verification code for HOU2ED',
      content: `<h2>Welcome to HOU2ED!</h2>
<p>Enter this 6-digit verification code in the app:</p>
<div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
  <h1 style="font-family: monospace; font-size: 36px; letter-spacing: 8px; color: #333; margin: 0;">
    {{ .Token }}
  </h1>
</div>
<p style="color: #666;">This code expires in 1 hour. If you didn't request this code, please ignore this email.</p>`
    },
    {
      type: 'email_change',
      subject: 'Confirm your new email for HOU2ED',
      content: `<h2>Email Change Verification</h2>
<p>Enter this 6-digit code to confirm your new email:</p>
<div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
  <h1 style="font-family: monospace; font-size: 36px; letter-spacing: 8px; color: #333; margin: 0;">
    {{ .Token }}
  </h1>
</div>
<p style="color: #666;">This code expires in 1 hour.</p>`
    },
    {
      type: 'recovery',
      subject: 'Your password reset code for HOU2ED',
      content: `<h2>Password Reset</h2>
<p>Enter this 6-digit code to reset your password:</p>
<div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
  <h1 style="font-family: monospace; font-size: 36px; letter-spacing: 8px; color: #333; margin: 0;">
    {{ .Token }}
  </h1>
</div>
<p style="color: #666;">This code expires in 1 hour. If you didn't request this, please ignore this email.</p>`
    }
  ];

  for (const template of templates) {
    await updateTemplate(template);
  }
}

async function updateTemplate(template) {
  return new Promise((resolve, reject) => {
    const templateData = JSON.stringify({
      template_id: template.type,
      subject: template.subject,
      content: template.content,
      type: 'otp' // Critical: Set type to OTP not magic_link
    });

    const options = {
      hostname: 'api.supabase.com',
      port: 443,
      path: `/v1/projects/${PROJECT_REF}/config/auth/templates/${template.type}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        'Content-Length': templateData.length
      }
    };

    console.log(`Updating ${template.type} template to use OTP...`);

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201 || res.statusCode === 204) {
          console.log(`✓ ${template.type} template updated successfully`);
          resolve(data);
        } else {
          console.error(`Error updating ${template.type}: Status ${res.statusCode}`);
          console.error('Response:', data);
          // Continue with other templates even if one fails
          resolve(data);
        }
      });
    });

    req.on('error', (error) => {
      console.error(`Error updating ${template.type}:`, error);
      resolve(); // Continue with other templates
    });

    req.write(templateData);
    req.end();
  });
}

// Main execution
async function main() {
  console.log('========================================');
  console.log('Updating Supabase to use OTP codes');
  console.log('========================================\n');

  try {
    // Update auth configuration
    await updateAuthConfig();

    // Update email templates
    await updateEmailTemplates();

    console.log('\n========================================');
    console.log('✓ All updates completed!');
    console.log('========================================');
    console.log('\nIMPORTANT: Changes may take a few minutes to propagate.');
    console.log('\nTest the changes:');
    console.log('1. Try signing up with a new email');
    console.log('2. Check your email for a 6-digit code (NOT a link)');
    console.log('3. Enter the code in the app to verify');

  } catch (error) {
    console.error('\nFailed to update configuration:', error.message);
    process.exit(1);
  }
}

// Run the script
main();