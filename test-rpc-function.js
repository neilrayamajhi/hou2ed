const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRPCFunction() {
  console.log('Testing RPC functions for fetching listings...\n');

  // Test 1: Try get_active_listings function
  console.log('1. Testing get_active_listings() RPC function:');
  try {
    const { data, error } = await supabase.rpc('get_active_listings', {
      user_lat: null,
      user_lng: null,
      radius_miles: 50
    });

    if (error) {
      console.log('   ❌ Error:', error.message);
      console.log('   Code:', error.code);
      if (error.code === '42883') {
        console.log('   Function does not exist - needs to be created');
      }
    } else {
      console.log('   ✅ Success! Found', data?.length || 0, 'listings');
      if (data && data.length > 0) {
        console.log('   First listing:', data[0].title);
      }
    }
  } catch (e) {
    console.log('   ❌ Exception:', e.message);
  }

  // Test 2: Try simpler get_all_active_listings function
  console.log('\n2. Testing get_all_active_listings() RPC function:');
  try {
    const { data, error } = await supabase.rpc('get_all_active_listings');

    if (error) {
      console.log('   ❌ Error:', error.message);
      console.log('   Code:', error.code);
      if (error.code === '42883') {
        console.log('   Function does not exist - needs to be created');
      }
    } else {
      console.log('   ✅ Success! Found', data?.length || 0, 'listings');
      if (data && data.length > 0) {
        console.log('   Listings:', data.map(l => `${l.title} (active: ${l.is_active})`).join(', '));
      }
    }
  } catch (e) {
    console.log('   ❌ Exception:', e.message);
  }

  // Test 3: Direct query with anon key (to check RLS)
  console.log('\n3. Testing direct query with anon key (RLS check):');
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('id, title, is_active')
      .eq('is_active', true)
      .limit(5);

    if (error) {
      console.log('   ❌ Error:', error.message);
      console.log('   This means RLS is blocking anon users from viewing listings');
    } else {
      console.log('   ✅ Success! Found', data?.length || 0, 'listings');
      if (data && data.length > 0) {
        console.log('   Listings:', data.map(l => l.title).join(', '));
      }
    }
  } catch (e) {
    console.log('   ❌ Exception:', e.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('DIAGNOSIS:');
  console.log('If the RPC functions return "function does not exist", they need to be created.');
  console.log('If the direct query returns 0 or errors, RLS policies need to be fixed.');
  console.log('The solution is to either:');
  console.log('1. Create the RPC functions (recommended for public data)');
  console.log('2. Fix the RLS policies to allow anon users to see active listings');
}

testRPCFunction();