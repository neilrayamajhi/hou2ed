/**
 * Check Supabase Auth Logs for SMTP Errors
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
// Using service key from .env.local
const SERVICE_KEY = 'sbp_b587d82512ccd48326fa62de11a9e5e94bf1688a';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkLogs() {
  console.log('════════════════════════════════════════════════════════════');
  console.log('   Checking Supabase Configuration');
  console.log('════════════════════════════════════════════════════════════\n');

  console.log('❌ Cannot check logs via API (requires dashboard access)\n');
  
  console.log('To see the ACTUAL error, YOU need to:');
  console.log('');
  console.log('1. Open: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/logs/auth-logs');
  console.log('');
  console.log('2. Look at the most recent errors');
  console.log('');
  console.log('3. Find the SMTP error - it will say something like:');
  console.log('   - "535 Authentication failed" → Wrong SendGrid credentials');
  console.log('   - "550 Sender not verified" → Verify sender email');
  console.log('   - "Connection refused" → Wrong host/port');
  console.log('   - "API key invalid" → SendGrid key is revoked');
  console.log('');
  console.log('4. Tell me EXACTLY what the error message says');
  console.log('');
  console.log('════════════════════════════════════════════════════════════');
  console.log('   OR Try This: Click "Send Test Email" Button');
  console.log('════════════════════════════════════════════════════════════\n');
  console.log('Go to: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/auth/settings');
  console.log('');
  console.log('Scroll to "Email Templates"');
  console.log('Click the "Send Test Email" button');
  console.log('');
  console.log('What happens?');
  console.log('  ✅ "Email sent successfully" → SMTP works!');
  console.log('  ❌ Error message → Tell me what it says');
  console.log('');
  console.log('════════════════════════════════════════════════════════════\n');
}

checkLogs();

