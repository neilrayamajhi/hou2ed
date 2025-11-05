const nodemailer = require('nodemailer');
const fetch = require('node-fetch');

async function comprehensiveEmailDebug() {
  console.log('🔍 COMPREHENSIVE EMAIL DEBUGGING');
  console.log('=================================\n');

  // Check SendGrid email activity via API
  console.log('Step 1: Checking SendGrid Activity via API');
  console.log('-------------------------------------------');

  const sendgridApiKey = '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';

  try {
    // Get recent email activity
    const activityResponse = await fetch('https://api.sendgrid.com/v3/messages?limit=10', {
      headers: {
        'Authorization': `Bearer ${sendgridApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (activityResponse.ok) {
      const messages = await activityResponse.json();
      console.log('Recent SendGrid activity:');

      if (messages.messages && messages.messages.length > 0) {
        messages.messages.forEach(msg => {
          console.log(`  • To: ${msg.to_email}`);
          console.log(`    Status: ${msg.status}`);
          console.log(`    Time: ${new Date(msg.last_event_time).toLocaleString()}`);
        });
      } else {
        console.log('  No recent email activity found');
      }
    } else {
      console.log('  Could not fetch activity (API may not have access)');
    }
  } catch (err) {
    console.log('  Activity API not available');
  }

  // Test different email scenarios
  console.log('\nStep 2: Testing Multiple Email Addresses');
  console.log('-----------------------------------------');

  const testEmails = [
    'neilrayamajhi2008@gmail.com',
    'test@mailinator.com', // Public inbox for testing
  ];

  const transporter = nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false,
    auth: {
      user: 'apikey',
      pass: sendgridApiKey
    }
  });

  for (const email of testEmails) {
    try {
      console.log(`\nSending to: ${email}`);

      const info = await transporter.sendMail({
        from: '"Hou2ed" <hou2eddirectory@gmail.com>',
        to: email,
        subject: `Hou2ed - Email Debug Test ${Date.now()}`,
        text: 'Testing email delivery. If you receive this, SendGrid is working!',
        html: `
          <h2>Email Delivery Test</h2>
          <p>Timestamp: ${new Date().toISOString()}</p>
          <p>If you receive this:</p>
          <ul>
            <li>✅ SendGrid SMTP is working</li>
            <li>✅ Credentials are valid</li>
            <li>✅ Email delivery is successful</li>
          </ul>
        `
      });

      console.log('  ✅ Sent successfully!');
      console.log('  Message ID:', info.messageId);

      if (email === 'test@mailinator.com') {
        console.log('  📧 Check at: https://www.mailinator.com/v4/public/inboxes.jsp?to=test');
      }
    } catch (error) {
      console.log('  ❌ Failed:', error.message);
    }
  }

  // Check spam/blocking issues
  console.log('\n\nStep 3: Checking for Email Blocking Issues');
  console.log('--------------------------------------------');
  console.log('Common reasons emails don\'t arrive:');
  console.log('1. Gmail blocking: Check "All Mail" folder');
  console.log('2. Corporate email: May have strict filters');
  console.log('3. SendGrid reputation: New accounts may be limited');

  console.log('\n🔍 CHECK THESE NOW:');
  console.log('1. Mailinator test inbox:');
  console.log('   https://www.mailinator.com/v4/public/inboxes.jsp?to=test');
  console.log('   (Should see test email there)');

  console.log('\n2. Gmail - ALL locations:');
  console.log('   • Primary inbox');
  console.log('   • Promotions tab');
  console.log('   • Spam folder');
  console.log('   • All Mail (includes blocked emails)');
  console.log('   • Trash (in case auto-deleted)');

  console.log('\n3. SendGrid Dashboard:');
  console.log('   https://app.sendgrid.com/email_activity');
  console.log('   Look for your email and check status');

  // Test Supabase Edge Function directly
  console.log('\n\nStep 4: Testing Edge Function Email Trigger');
  console.log('--------------------------------------------');

  const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
  const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4OTg4NiwiZXhwIjoyMDczOTY1ODg2fQ.J9Oc77ZR1E435SqDsngt8ey4_WVOeTE6UASlYo17Gbc';

  try {
    // Create a custom Edge Function to send email directly
    console.log('Creating custom email sender Edge Function...');

    const emailFunctionCode = `
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, subject, html } = await req.json()

    // Send via SendGrid API directly
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ${sendgridApiKey}',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: 'hou2eddirectory@gmail.com', name: 'Hou2ed' },
        subject: subject,
        content: [{ type: 'text/html', value: html }]
      })
    })

    if (response.status === 202) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } else {
      const error = await response.text()
      return new Response(JSON.stringify({ success: false, error }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})`;

    console.log('\n💡 ALTERNATIVE SOLUTION:');
    console.log('If Supabase SMTP won\'t work, create an Edge Function that sends emails directly via SendGrid API');
    console.log('This bypasses SMTP entirely and uses the SendGrid REST API');

  } catch (err) {
    console.log('Edge function test skipped');
  }

  console.log('\n\n' + '='.repeat(60));
  console.log('📊 DEBUGGING SUMMARY');
  console.log('='.repeat(60));

  console.log('\n🔍 What to check RIGHT NOW:');
  console.log('1. Mailinator inbox (link above) - should have test email');
  console.log('2. SendGrid Activity dashboard - check email status');
  console.log('3. Your Gmail "All Mail" folder - might be hidden there');

  console.log('\n🚨 If emails show as "Delivered" in SendGrid but you don\'t receive them:');
  console.log('  → Gmail/email provider is blocking them');
  console.log('  → Try a different email address');
  console.log('  → Check email filters/rules');

  console.log('\n🔧 SOLUTIONS:');
  console.log('Option 1: Use Supabase default email (turn OFF custom SMTP)');
  console.log('Option 2: Create Edge Function to send via SendGrid API');
  console.log('Option 3: Try different email provider (Resend, Postmark)');
  console.log('Option 4: Use phone/SMS verification instead of email');
}

comprehensiveEmailDebug();