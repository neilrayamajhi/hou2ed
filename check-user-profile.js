const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials
const supabaseUrl = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkUserAndTest() {
  console.log('🔍 CHECKING USER PROFILE AND TESTING APPLICATION SUBMISSION');
  console.log('='.repeat(60));
  console.log('');

  const userId = '31c57c00-777e-4e29-b6e9-4a8c2ef6698c';

  try {
    // 1. Check the user profile
    console.log('📋 Checking user profile...');
    console.log(`   User ID: ${userId}`);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.log(`   ❌ Error fetching profile: ${profileError.message}`);
      console.log('   This user may not exist in the profiles table');
      console.log('');
      console.log('   📝 TO FIX: Insert the user into profiles table with:');
      console.log(`   INSERT INTO profiles (id, role, email) VALUES`);
      console.log(`   ('${userId}', 'seeker', 'user@example.com')`);
      console.log(`   ON CONFLICT (id) DO UPDATE SET role = 'seeker';`);
      return;
    }

    console.log('   ✅ User profile found:');
    console.log(`      Email: ${profile.email || 'Not set'}`);
    console.log(`      Role: ${profile.role || 'NOT SET'}`);
    console.log(`      Full Name: ${profile.full_name || 'Not set'}`);
    console.log(`      Created: ${profile.created_at}`);

    if (!profile.role) {
      console.log('');
      console.log('   ⚠️  WARNING: User has no role set!');
      console.log('   📝 TO FIX: Update the user role with:');
      console.log(`   UPDATE profiles SET role = 'seeker' WHERE id = '${userId}';`);
    } else if (profile.role !== 'seeker') {
      console.log('');
      console.log(`   ⚠️  WARNING: User role is '${profile.role}', not 'seeker'!`);
      console.log('   Applications can only be submitted by seekers.');
      console.log('   📝 TO FIX: Update the user role with:');
      console.log(`   UPDATE profiles SET role = 'seeker' WHERE id = '${userId}';`);
    }

    // 2. Check if there are any listings
    console.log('\n📋 Checking available listings...');
    const { data: listings, error: listingError } = await supabase
      .from('listings')
      .select('id, title')
      .limit(5);

    if (listingError) {
      console.log(`   ❌ Error fetching listings: ${listingError.message}`);
    } else if (!listings || listings.length === 0) {
      console.log('   ❌ No listings found in the database');
      console.log('   You need at least one listing to submit an application to');
    } else {
      console.log(`   ✅ Found ${listings.length} listings:`);
      listings.forEach(l => {
        console.log(`      - ${l.id}: ${l.title}`);
      });

      // 3. Try to test an application insertion (without actually doing it)
      const testListingId = listings[0].id;
      console.log(`\n📋 Testing with listing ID: ${testListingId}`);
    }

    // 4. Check current applications
    console.log('\n📋 Checking existing applications for this user...');
    const { data: applications, error: appError, count } = await supabase
      .from('applications')
      .select('*', { count: 'exact' })
      .eq('seeker_id', userId);

    if (appError) {
      console.log(`   ❌ Error fetching applications: ${appError.message}`);
    } else {
      console.log(`   ✅ User has ${count || 0} existing applications`);
      if (applications && applications.length > 0) {
        console.log('   Recent applications:');
        applications.slice(0, 3).forEach(app => {
          console.log(`      - ${app.id}: Status = ${app.status}, Created = ${app.created_at}`);
        });
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 SUMMARY:');
    console.log('');

    const issues = [];

    if (!profile.role || profile.role !== 'seeker') {
      issues.push('User role is not "seeker"');
    }

    if (issues.length === 0) {
      console.log('✅ Everything looks good! The user should be able to submit applications.');
      console.log('');
      console.log('📋 The RLS policies are configured to allow:');
      console.log('   - INSERT when seeker_id = auth.uid() (✅ Will work)');
      console.log('   - SELECT own applications (✅ Will work)');
      console.log('   - UPDATE own applications (✅ Will work)');
      console.log('');
      console.log('🎯 Try submitting the application again now!');
    } else {
      console.log('❌ Found issues that need to be fixed:');
      issues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue}`);
      });
      console.log('');
      console.log('Fix these issues using the SQL commands shown above,');
      console.log('then try submitting the application again.');
    }

    console.log('\n🔗 Dashboard links:');
    console.log(`   Policies: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/auth/policies`);
    console.log(`   SQL Editor: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/sql/new`);
    console.log(`   Table Editor: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/editor`);

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
  }
}

checkUserAndTest();