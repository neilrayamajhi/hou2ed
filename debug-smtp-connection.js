const nodemailer = require('nodemailer');

async function debugSMTPConnection() {
  console.log('🔍 DEBUGGING SMTP CONNECTION');
  console.log('============================\n');

  // Test SendGrid SMTP directly
  const transporter = nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: 'apikey', // This MUST be the string 'apikey'
      pass: process.env.SENDGRID_API_KEY || 'YOUR_SENDGRID_API_KEY_HERE'
    }
  });

  console.log('Testing SMTP connection with these settings:');
  console.log('  Host: smtp.sendgrid.net');
  console.log('  Port: 587');
  console.log('  Username: apikey');
  console.log('  Password: SG.s_CiepO...\n');

  try {
    // Verify connection
    console.log('Step 1: Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful!\n');

    // Send test email
    console.log('Step 2: Sending test email...');
    const info = await transporter.sendMail({
      from: '"Hou2ed" <hou2eddirectory@gmail.com>',
      to: 'neilrayamajhi2008@gmail.com',
      subject: 'Hou2ed - SMTP Debug Test',
      text: 'If you receive this, SMTP settings are correct!',
      html: '<b>If you receive this, SMTP settings are correct!</b><br><br>This means:<br>• SendGrid SMTP works<br>• Credentials are valid<br>• The issue is with Supabase configuration'
    });

    console.log('✅ Email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   Check neilrayamajhi2008@gmail.com inbox\n');

    console.log('📋 VERIFIED WORKING SETTINGS:');
    console.log('==============================');
    console.log('Host: smtp.sendgrid.net');
    console.log('Port: 587');
    console.log('Username: apikey');
    console.log('Password: [Your SendGrid API key]');
    console.log('Sender: hou2eddirectory@gmail.com\n');

    console.log('🔧 COPY THESE EXACTLY TO SUPABASE:');
    console.log('1. Make sure "Enable custom SMTP" is ON');
    console.log('2. Enter the settings above EXACTLY');
    console.log('3. No extra spaces before or after');
    console.log('4. Username must be the word: apikey');

  } catch (error) {
    console.log('❌ SMTP connection failed!\n');
    console.log('Error:', error.message);

    if (error.message.includes('Invalid login')) {
      console.log('\n🔧 FIX: Authentication issue');
      console.log('  • Username MUST be: apikey');
      console.log('  • Password is your SendGrid API key');
      console.log('  • Check for extra spaces');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('\n🔧 FIX: Connection issue');
      console.log('  • Check port is 587');
      console.log('  • Check host is smtp.sendgrid.net');
    }
  }
}

// Check if nodemailer is installed
try {
  require.resolve('nodemailer');
  debugSMTPConnection();
} catch(e) {
  console.log('📦 Installing nodemailer...');
  console.log('Run: npm install nodemailer');
  console.log('Then: node debug-smtp-connection.js');
}