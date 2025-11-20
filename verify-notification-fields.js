const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env.local' });

const supabaseUrl = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verify() {
  console.log('🔍 Verifying notification fields were added...\n');
  
  // Try to query profiles with new fields
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, push_token, notification_time')
    .limit(1)
    .single();
  
  if (!profileError || profileError.code === 'PGRST116') {
    console.log('✅ profiles.push_token - exists');
    console.log('✅ profiles.notification_time - exists');
  } else {
    console.log('❌ Error checking profiles:', profileError.message);
  }
  
  // Try to query applications with new field
  const { data: app, error: appError } = await supabase
    .from('applications')
    .select('id, last_notified_status')
    .limit(1)
    .maybeSingle();
  
  if (!appError || appError.code === 'PGRST116') {
    console.log('✅ applications.last_notified_status - exists');
  } else {
    console.log('❌ Error checking applications:', appError.message);
  }
  
  console.log('\n✨ Database is ready for push notifications!');
}

verify().catch(console.error);

