/**
 * Simple fix for rayamajhineil@gmail.com orphaned account
 * Uses .env file for credentials
 */

require('dotenv').config({ path: './app/.env' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const EMAIL = 'rayamajhineil@gmail.com';

async function fix() {
  console.log('🔧 Fixing account:', EMAIL);
  
  if (!SERVICE_KEY) {
    console.log('');
    console.log('❌ No service key found in .env');
    console.log('');
    console.log('Add to app/.env:');
    console.log('SUPABASE_SERVICE_ROLE_KEY=your-service-key');
    console.log('');
    console.log('Get it from: Supabase Dashboard → Settings → API → service_role key');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    // Find user in auth
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users?.users.find(u => u.email?.toLowerCase() === EMAIL.toLowerCase());

    if (!user) {
      console.log('✅ Email is free! You can sign up now.');
      return;
    }

    console.log('Found orphaned account:', user.id);
    console.log('Deleting...');

    await supabase.auth.admin.deleteUser(user.id);
    
    console.log('');
    console.log('✅ DONE! Account deleted.');
    console.log('🎉 You can now sign up with', EMAIL);

  } catch (err) {
    console.error('Error:', err.message);
  }
}

fix();

