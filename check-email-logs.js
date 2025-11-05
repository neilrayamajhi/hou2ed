const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4OTg4NiwiZXhwIjoyMDczOTY1ODg2fQ.J9Oc77ZR1E435SqDsngt8ey4_WVOeTE6UASlYo17Gbc';

async function checkEmailLogs() {
  console.log('📧 Checking Email Configuration & Recent Activity');
  console.log('================================================\n');

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // Check recent users and their confirmation status
    console.log('Recent User Signups:');
    console.log('-------------------');
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 10
    });

    if (users) {
      const recentUsers = users
        .filter(u => {
          const createdDate = new Date(u.created_at);
          const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
          return createdDate > hourAgo;
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      if (recentUsers.length === 0) {
        console.log('No users created in the last hour');
      } else {
        recentUsers.forEach(user => {
          const createdAt = new Date(user.created_at);
          const confirmedAt = user.email_confirmed_at ? new Date(user.email_confirmed_at) : null;
          const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at) : null;

          console.log(`\n  ${user.email}:`);
          console.log(`    Created: ${createdAt.toLocaleTimeString()}`);
          console.log(`    Confirmed: ${confirmedAt ? confirmedAt.toLocaleTimeString() : 'NOT CONFIRMED'}`);
          console.log(`    Confirmation Sent: ${user.confirmation_sent_at ? 'Yes' : 'No/Unknown'}`);
          console.log(`    Last Sign In: ${lastSignIn ? lastSignIn.toLocaleTimeString() : 'Never'}`);

          if (!user.email_confirmed_at && user.confirmation_sent_at) {
            console.log(`    ⚠️ Email sent but not confirmed - user may not have received it`);
          } else if (!user.email_confirmed_at && !user.confirmation_sent_at) {
            console.log(`    ❌ No confirmation email sent`);
          }
        });
      }
    }

    console.log('\n\n📊 Email Sending Diagnosis:');
    console.log('==========================');

    console.log('\nPossible Issues:');
    console.log('1. SMTP Configuration:');
    console.log('   - Go to: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/settings/auth');
    console.log('   - Check "SMTP Settings" section');
    console.log('   - Make sure "Enable custom SMTP" is ON');

    console.log('\n2. Common SMTP Problems:');
    console.log('   - SendGrid: API key might be wrong or expired');
    console.log('   - SendGrid: Sender email not verified');
    console.log('   - Resend: API key issues');
    console.log('   - Gmail: App password needed (not regular password)');

    console.log('\n3. Test Your SMTP:');
    console.log('   - In Supabase Dashboard → Auth Settings');
    console.log('   - Find "Send test email" button');
    console.log('   - Click it and check if you receive the test');

    console.log('\n4. Check Email Provider Dashboard:');
    console.log('   - SendGrid: https://app.sendgrid.com/');
    console.log('   - Look for bounced emails or errors');
    console.log('   - Check if emails are being sent but blocked');

    console.log('\n🔧 Quick Fix Options:');
    console.log('========================');
    console.log('Option 1: Use Supabase Default Email (Limited)');
    console.log('  - Turn OFF custom SMTP');
    console.log('  - Limited to 3 emails/hour');
    console.log('  - Good for testing');

    console.log('\nOption 2: Fix Your SMTP');
    console.log('  - Verify API key is correct');
    console.log('  - Check sender email is verified');
    console.log('  - Try port 587 (TLS) or 465 (SSL)');

    console.log('\nOption 3: Try Different Provider');
    console.log('  - SendGrid: Free 100/day');
    console.log('  - Resend: Free tier available');
    console.log('  - Postmark: Developer friendly');

  } catch (err) {
    console.error('Error:', err);
  }
}

checkEmailLogs();