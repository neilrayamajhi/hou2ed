const https = require('https');

// You need to get these from: https://supabase.com/dashboard/account/tokens
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || 'YOUR_ACCESS_TOKEN_HERE';
const PROJECT_REF = 'rixiofltzptwaiwxhhlf';

async function updateEmailTemplates() {
  if (SUPABASE_ACCESS_TOKEN === 'YOUR_ACCESS_TOKEN_HERE') {
    console.log('❌ You need to set your Supabase access token first!');
    console.log('\n1. Go to: https://supabase.com/dashboard/account/tokens');
    console.log('2. Create a new access token');
    console.log('3. Run this script with: SUPABASE_ACCESS_TOKEN=your_token node update-email-templates.js');

    // Open the page for them
    require('child_process').exec('open "https://supabase.com/dashboard/account/tokens"');
    return;
  }

  const templates = {
    'confirm_signup': {
      subject: 'Your verification code: {{ .Token }}',
      content: `<h2>Welcome to HOU2ED!</h2>
<p>Your 6-digit verification code is:</p>
<h1 style="font-size: 36px; letter-spacing: 8px; font-family: monospace; background: #f0f0f0; padding: 20px; text-align: center; border-radius: 8px;">{{ .Token }}</h1>
<p>Enter this code in the app to verify your email address.</p>
<p style="color: #666;">This code will expire in 60 minutes.</p>
<p style="color: #999; font-size: 12px;">If you didn't sign up for HOU2ED, please ignore this email.</p>`
    },
    'magic_link': {
      subject: 'Your login code: {{ .Token }}',
      content: `<h2>Login to HOU2ED</h2>
<p>Your 6-digit login code is:</p>
<h1 style="font-size: 36px; letter-spacing: 8px; font-family: monospace; background: #f0f0f0; padding: 20px; text-align: center; border-radius: 8px;">{{ .Token }}</h1>
<p>Enter this code in the app to log in.</p>
<p style="color: #666;">This code will expire in 60 minutes.</p>
<p style="color: #999; font-size: 12px;">If you didn't request this login, please ignore this email.</p>`
    },
    'reset_password': {
      subject: 'Reset your password: {{ .Token }}',
      content: `<h2>Reset Your HOU2ED Password</h2>
<p>Your 6-digit password reset code is:</p>
<h1 style="font-size: 36px; letter-spacing: 8px; font-family: monospace; background: #f0f0f0; padding: 20px; text-align: center; border-radius: 8px;">{{ .Token }}</h1>
<p>Enter this code in the app to reset your password.</p>
<p style="color: #666;">This code will expire in 60 minutes.</p>
<p style="color: #999; font-size: 12px;">If you didn't request a password reset, please ignore this email.</p>`
    }
  };

  console.log('🔄 Updating email templates to use OTP codes...\n');

  for (const [templateType, template] of Object.entries(templates)) {
    console.log(`Updating ${templateType}...`);

    const data = JSON.stringify({
      type: templateType,
      subject: template.subject,
      content: template.content,
      content_type: 'html'
    });

    const options = {
      hostname: 'api.supabase.com',
      port: 443,
      path: `/v1/projects/${PROJECT_REF}/config/auth/email-templates/${templateType}`,
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    try {
      const result = await new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          let body = '';
          res.on('data', (chunk) => body += chunk);
          res.on('end', () => {
            if (res.statusCode === 200 || res.statusCode === 204) {
              console.log(`✅ ${templateType} updated successfully!`);
              resolve(true);
            } else {
              console.log(`❌ Failed to update ${templateType}: ${res.statusCode}`);
              console.log('Response:', body);
              resolve(false);
            }
          });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
      });
    } catch (error) {
      console.error(`Error updating ${templateType}:`, error.message);
    }
  }

  console.log('\n✅ Email templates update complete!');
  console.log('Your app will now receive 6-digit OTP codes instead of magic links.');
}

updateEmailTemplates();