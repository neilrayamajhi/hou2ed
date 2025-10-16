// Script to update Supabase email template to use OTP codes
const https = require('https');

// Your Supabase project details
const PROJECT_REF = 'rixiofltzptwaiwxhhlf';
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

// The email template for OTP
const emailTemplate = {
  "template_id": "confirmation",
  "subject": "Your verification code for HOU2ED",
  "content": `
    <h2>Your verification code</h2>
    <p>Enter this 6-digit code in the app:</p>
    <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
      <h1 style="font-family: monospace; font-size: 36px; letter-spacing: 5px; color: #333;">
        {{ .Token }}
      </h1>
    </div>
    <p>This code expires in 1 hour.</p>
    <p>If you didn't request this code, please ignore this email.</p>
  `,
  "type": "otp" // This is the key - set type to OTP not magic_link
};

const options = {
  hostname: 'api.supabase.com',
  port: 443,
  path: `/v1/projects/${PROJECT_REF}/config/auth`,
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`
  }
};

const data = JSON.stringify({
  email_templates: {
    confirmation: emailTemplate
  },
  enable_confirmations: true,
  otp_length: 6,
  otp_expiry: 3600
});

if (!SUPABASE_ACCESS_TOKEN) {
  console.error('Error: SUPABASE_ACCESS_TOKEN environment variable is not set');
  console.log('Please get your access token from: https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

const req = https.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);

  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.write(data);
req.end();

console.log('Updating Supabase email template to use OTP codes...');