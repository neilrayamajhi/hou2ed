const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4OTg4NiwiZXhwIjoyMDczOTY1ODg2fQ.J9Oc77ZR1E435SqDsngt8ey4_WVOeTE6UASlYo17Gbc';

async function verifyFix() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log('🔍 Checking what policies exist...\n');

  // Check INSERT policies
  const { data: policies, error } = await supabase
    .from('pg_policies')
    .select('policyname, cmd')
    .eq('tablename', 'profiles')
    .eq('cmd', 'INSERT');

  if (error) {
    console.log('❌ Could not check policies:', error.message);
  } else {
    console.log('INSERT Policies on profiles table:');
    if (policies && policies.length > 0) {
      policies.forEach(p => console.log(`  ✅ ${p.policyname}`));
    } else {
      console.log('  ❌ NO INSERT POLICIES FOUND! This is the problem!');
    }
  }

  console.log('\n🔍 Checking if trigger exists...\n');
  
  const { data: triggers } = await supabase
    .from('pg_trigger')
    .select('tgname')
    .eq('tgname', 'on_auth_user_created');

  if (triggers && triggers.length > 0) {
    console.log('  ✅ Trigger exists');
  } else {
    console.log('  ❌ Trigger NOT found!');
  }

  console.log('\n📋 The issue: Either policies or trigger are missing.');
  console.log('   Let me apply the fix again with a different method...\n');
}

verifyFix();

