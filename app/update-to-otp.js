const https = require('https');

const SUPABASE_ACCESS_TOKEN = 'sbp_35b563bea5d4526a6d8fdd91debc5ddb9d180c03';
const PROJECT_REF = 'rixiofltzptwaiwxhhlf';

async function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.supabase.com',
      port: 443,
      path: `/v1/projects/${PROJECT_REF}${path}`,
      method: method,
      headers: {
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(body ? JSON.parse(body) : {});
          } catch {
            resolve(body);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function updateEmailTemplates() {
  console.log('🔄 Updating Supabase email templates to use OTP codes...\n');

  try {
    // First, let's get the current config
    console.log('Fetching current auth configuration...');
    const currentConfig = await makeRequest('/config/auth', 'GET');
    console.log('✅ Current config fetched\n');

    // Update the email templates configuration
    const updates = {
      external_email_enabled: true,
      mailer_autoconfirm: false,
      mailer_otp_exp: 3600, // 1 hour expiry for OTP codes
      mailer_templates: {
        confirmation: {
          subject: 'Your verification code: {{ .Token }}',
          content: `<h2>Welcome to HOU2ED!</h2>
<p>Your 6-digit verification code is:</p>
<h1 style="font-size: 36px; letter-spacing: 8px; font-family: monospace; background: #f0f0f0; padding: 20px; text-align: center; border-radius: 8px; color: #333;">{{ .Token }}</h1>
<p>Enter this code in the app to verify your email address.</p>
<p style="color: #666;">This code will expire in 60 minutes.</p>
<p style="color: #999; font-size: 12px;">If you didn't sign up for HOU2ED, please ignore this email.</p>`,
          content_type: 'html'
        },
        recovery: {
          subject: 'Reset your password: {{ .Token }}',
          content: `<h2>Reset Your HOU2ED Password</h2>
<p>Your 6-digit password reset code is:</p>
<h1 style="font-size: 36px; letter-spacing: 8px; font-family: monospace; background: #f0f0f0; padding: 20px; text-align: center; border-radius: 8px; color: #333;">{{ .Token }}</h1>
<p>Enter this code in the app to reset your password.</p>
<p style="color: #666;">This code will expire in 60 minutes.</p>
<p style="color: #999; font-size: 12px;">If you didn't request a password reset, please ignore this email.</p>`,
          content_type: 'html'
        },
        magic_link: {
          subject: 'Your login code: {{ .Token }}',
          content: `<h2>Login to HOU2ED</h2>
<p>Your 6-digit login code is:</p>
<h1 style="font-size: 36px; letter-spacing: 8px; font-family: monospace; background: #f0f0f0; padding: 20px; text-align: center; border-radius: 8px; color: #333;">{{ .Token }}</h1>
<p>Enter this code in the app to log in.</p>
<p style="color: #666;">This code will expire in 60 minutes.</p>
<p style="color: #999; font-size: 12px;">If you didn't request this login, please ignore this email.</p>`,
          content_type: 'html'
        },
        email_change: {
          subject: 'Confirm your email change: {{ .Token }}',
          content: `<h2>Confirm Your Email Change</h2>
<p>Your 6-digit verification code is:</p>
<h1 style="font-size: 36px; letter-spacing: 8px; font-family: monospace; background: #f0f0f0; padding: 20px; text-align: center; border-radius: 8px; color: #333;">{{ .Token }}</h1>
<p>Enter this code in the app to confirm your new email address.</p>
<p style="color: #666;">This code will expire in 60 minutes.</p>`,
          content_type: 'html'
        }
      }
    };

    console.log('Updating auth configuration with OTP templates...');
    await makeRequest('/config/auth', 'PATCH', updates);
    console.log('✅ Email templates updated successfully!\n');

    console.log('=== SUCCESS ===');
    console.log('Your Supabase project is now configured to send 6-digit OTP codes instead of magic links!');
    console.log('\nThe following templates have been updated:');
    console.log('✅ Sign up confirmation - sends OTP code');
    console.log('✅ Magic link login - sends OTP code');
    console.log('✅ Password reset - sends OTP code');
    console.log('✅ Email change - sends OTP code');
    console.log('\nUsers will now receive 6-digit codes in their emails instead of clickable links.');

  } catch (error) {
    console.error('❌ Error updating templates:', error.message);

    // If the API approach doesn't work, let's try a different method
    console.log('\nTrying alternative method...');

    // Let's check if we need different permissions
    if (error.message.includes('403') || error.message.includes('401')) {
      console.log('\n⚠️  Access token might not have sufficient permissions.');
      console.log('Please ensure your access token has the following scopes:');
      console.log('- projects:read');
      console.log('- projects:write');
      console.log('\nYou can create a new token at:');
      console.log('https://supabase.com/dashboard/account/tokens');
    }
  }
}

// Run the update
updateEmailTemplates();