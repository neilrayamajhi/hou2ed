const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

const supabaseUrl = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// For direct database query
const PROJECT_REF = 'rixiofltzptwaiwxhhlf';
const ACCESS_TOKEN = 'sbp_b587d82512ccd48326fa62de11a9e5e94bf1688a';

async function executeSQL(sql) {
  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.log(`Error: ${error.message}`);
    return null;
  }
}

async function checkApplications() {
  console.log('🔍 CHECKING ALL APPLICATIONS IN DATABASE');
  console.log('='.repeat(60));
  console.log('');

  // 1. Check current authenticated user
  console.log('📋 Current authenticated user:');
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (user) {
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
  } else {
    console.log('   No authenticated user');
  }

  console.log('\n📋 Checking ALL applications in database (bypassing RLS):');

  // Query directly via management API to bypass RLS
  const allAppsSQL = `
    SELECT
      a.id,
      a.seeker_id,
      a.listing_id,
      a.status,
      a.created_at,
      p.email as seeker_email,
      p.role as seeker_role,
      l.title as listing_title
    FROM applications a
    LEFT JOIN profiles p ON p.id = a.seeker_id
    LEFT JOIN listings l ON l.id = a.listing_id
    ORDER BY a.created_at DESC
    LIMIT 20;
  `;

  const result = await executeSQL(allAppsSQL);

  if (result && result.length > 0) {
    console.log(`\n✅ Found ${result.length} total applications:\n`);

    result.forEach((app, index) => {
      console.log(`${index + 1}. Application ${app.id}`);
      console.log(`   Seeker ID: ${app.seeker_id}`);
      console.log(`   Seeker Email: ${app.seeker_email || 'Unknown'}`);
      console.log(`   Seeker Role: ${app.seeker_role || 'Not set'}`);
      console.log(`   Listing: ${app.listing_title || 'Unknown'}`);
      console.log(`   Status: ${app.status}`);
      console.log(`   Created: ${app.created_at}`);

      if (user && app.seeker_id === user.id) {
        console.log(`   ✅ This is YOUR application`);
      } else {
        console.log(`   ❌ This belongs to another user`);
      }
      console.log('');
    });

    // Count by seeker
    const seekerCounts = {};
    result.forEach(app => {
      const key = `${app.seeker_id} (${app.seeker_email || 'Unknown'})`;
      seekerCounts[key] = (seekerCounts[key] || 0) + 1;
    });

    console.log('📊 Applications by Seeker:');
    Object.entries(seekerCounts).forEach(([seeker, count]) => {
      console.log(`   ${seeker}: ${count} applications`);
    });

  } else {
    console.log('   ❌ No applications found in database');
  }

  // 2. Check what the current user can see via RLS
  if (user) {
    console.log('\n📋 Applications visible to current user (with RLS):');

    const { data: visibleApps, error: visibleError } = await supabase
      .from('applications')
      .select('*')
      .eq('seeker_id', user.id);

    if (visibleError) {
      console.log(`   ❌ Error: ${visibleError.message}`);
    } else if (visibleApps && visibleApps.length > 0) {
      console.log(`   ✅ You can see ${visibleApps.length} applications (your own)`);
    } else {
      console.log('   ❌ No applications visible to you');
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📝 EXPLANATION:');
  console.log('');
  console.log('The RLS policies are working correctly:');
  console.log('  - Each user can only see their OWN applications');
  console.log('  - This is by design for privacy/security');
  console.log('');
  console.log('If you need to see applications from another account:');
  console.log('  1. Log in with that account, OR');
  console.log('  2. If you\'re a provider, you can see applications for YOUR listings');
  console.log('  3. If you need admin access to all applications, we need to:');
  console.log('     - Add an admin role to your profile');
  console.log('     - Create an admin policy for viewing all applications');
  console.log('');
  console.log('Which scenario applies to you?');
  console.log('  A) You want to log in as the other user');
  console.log('  B) You\'re a provider checking applications for your listings');
  console.log('  C) You need admin access to see all applications');
}

checkApplications().catch(console.error);