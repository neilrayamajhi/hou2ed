const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read Supabase credentials from environment
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://hqxxaxlwfkznwndvgqya.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxeHhheGx3Zmt6bnduZHZncXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY2NzcxODAsImV4cCI6MjA0MjI1MzE4MH0.YzJaXIhoii0oO3B0m3sRBh70fG7pGwRoSC6j6u0KOAI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyRLSFix() {
  console.log('🔧 Applying RLS fixes for applications table...');

  // Read the SQL migration file
  const sqlPath = path.join(__dirname, 'supabase/migrations/20251111_fix_applications_rls.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  try {
    // Execute the SQL through Supabase's RPC
    // Note: We need to use the Supabase dashboard or CLI to run raw SQL
    // For now, let's create a simpler fix that we can apply programmatically

    console.log('\n📋 SQL Migration to apply:');
    console.log('=====================================');
    console.log(sql);
    console.log('=====================================\n');

    console.log('⚠️  IMPORTANT: This SQL needs to be applied via one of these methods:');
    console.log('');
    console.log('Option 1: Supabase Dashboard');
    console.log('1. Go to: https://supabase.com/dashboard/project/hqxxaxlwfkznwndvgqya/sql/new');
    console.log('2. Paste the SQL from the file: supabase/migrations/20251111_fix_applications_rls.sql');
    console.log('3. Click "Run" to execute');
    console.log('');
    console.log('Option 2: Using Supabase CLI (if you have service role key)');
    console.log('1. Set SUPABASE_SERVICE_ROLE_KEY environment variable');
    console.log('2. Run: npx supabase db push --db-url "postgresql://postgres.[project-ref]:[service-role-key]@aws-0-us-west-1.pooler.supabase.com:5432/postgres"');
    console.log('');
    console.log('Option 3: Direct PostgreSQL connection (if available)');
    console.log('Use any PostgreSQL client to connect and run the SQL');

    // For immediate testing, let's try a workaround by checking current user permissions
    console.log('\n🔍 Checking current user authentication...');

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error('❌ Auth error:', authError.message);
      return;
    }

    if (!user) {
      console.log('❌ No authenticated user found');
      console.log('Make sure you are logged in as a seeker to test application submission');
      return;
    }

    console.log('✅ Current user:', user.email);
    console.log('   User ID:', user.id);

    // Check user role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('❌ Error fetching profile:', profileError.message);
      return;
    }

    console.log('   User role:', profile?.role || 'Not set');

    if (profile?.role !== 'seeker') {
      console.log('\n⚠️  Warning: Current user is not a seeker. Applications can only be submitted by users with "seeker" role.');
      console.log('To fix: Make sure the logged-in user has role = "seeker" in the profiles table');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the fix
applyRLSFix();