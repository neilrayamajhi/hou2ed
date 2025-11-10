const fetch = require('node-fetch');
const fs = require('fs').promises;

// Supabase Management API credentials
const SUPABASE_ACCESS_TOKEN = 'sbp_35b563bea5d4526a6d8fdd91debc5ddb9d180c03';
const PROJECT_REF = 'rixiofltzptwaiwxhhlf';

async function executeSQL(sql) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${response.status} - ${error}`);
  }

  return await response.json();
}

async function applyFix() {
  console.log('🚀 Applying listings visibility fix via Supabase Management API...\n');

  try {
    // Step 1: Drop existing policies
    console.log('1. Dropping existing policies...');
    const dropPolicies = `
      DO $$
      DECLARE
          pol record;
      BEGIN
          FOR pol IN
              SELECT policyname
              FROM pg_policies
              WHERE tablename = 'listings'
              AND schemaname = 'public'
          LOOP
              EXECUTE format('DROP POLICY IF EXISTS %I ON public.listings', pol.policyname);
          END LOOP;
      END $$;
    `;
    await executeSQL(dropPolicies);
    console.log('   ✅ Existing policies dropped\n');

    // Step 2: Create new RLS policies
    console.log('2. Creating new RLS policies...');

    const policies = [
      {
        name: 'public_view_active_listings',
        sql: `CREATE POLICY "public_view_active_listings"
              ON public.listings
              FOR SELECT
              TO public
              USING (is_active = true);`
      },
      {
        name: 'providers_view_own_listings',
        sql: `CREATE POLICY "providers_view_own_listings"
              ON public.listings
              FOR SELECT
              TO authenticated
              USING (auth.uid() = provider_id);`
      },
      {
        name: 'providers_insert_listings',
        sql: `CREATE POLICY "providers_insert_listings"
              ON public.listings
              FOR INSERT
              TO authenticated
              WITH CHECK (auth.uid() = provider_id);`
      },
      {
        name: 'providers_update_listings',
        sql: `CREATE POLICY "providers_update_listings"
              ON public.listings
              FOR UPDATE
              TO authenticated
              USING (auth.uid() = provider_id)
              WITH CHECK (auth.uid() = provider_id);`
      },
      {
        name: 'providers_delete_listings',
        sql: `CREATE POLICY "providers_delete_listings"
              ON public.listings
              FOR DELETE
              TO authenticated
              USING (auth.uid() = provider_id);`
      }
    ];

    for (const policy of policies) {
      await executeSQL(policy.sql);
      console.log(`   ✅ Created policy: ${policy.name}`);
    }
    console.log();

    // Step 3: Create RPC function
    console.log('3. Creating RPC function get_active_listings...');
    const createFunction = `
      CREATE OR REPLACE FUNCTION public.get_active_listings(
          user_lat DOUBLE PRECISION DEFAULT NULL,
          user_lng DOUBLE PRECISION DEFAULT NULL,
          radius_miles INTEGER DEFAULT 50
      )
      RETURNS TABLE (
          id UUID,
          title TEXT,
          description TEXT,
          address TEXT,
          city TEXT,
          state TEXT,
          zip_code TEXT,
          lat DOUBLE PRECISION,
          lng DOUBLE PRECISION,
          housing_type TEXT,
          unit_beds JSONB,
          availability JSONB,
          cost JSONB,
          amenities JSONB,
          services JSONB,
          rules JSONB,
          eligibility JSONB,
          accessibility JSONB,
          intake JSONB,
          gender_rooming TEXT,
          images TEXT[],
          provider_id UUID,
          verified BOOLEAN,
          is_active BOOLEAN,
          created_at TIMESTAMPTZ,
          updated_at TIMESTAMPTZ
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      BEGIN
          RETURN QUERY
          SELECT
              l.id,
              l.title,
              l.description,
              l.address,
              l.city,
              l.state,
              l.zip_code,
              l.lat,
              l.lng,
              l.housing_type,
              l.unit_beds,
              l.availability,
              l.cost,
              l.amenities,
              l.services,
              l.rules,
              l.eligibility,
              l.accessibility,
              l.intake,
              l.gender_rooming,
              l.images,
              l.provider_id,
              l.verified,
              l.is_active,
              l.created_at,
              l.updated_at
          FROM public.listings l
          WHERE l.is_active = true
          ORDER BY l.created_at DESC
          LIMIT 100;
      END;
      $$;
    `;
    await executeSQL(createFunction);
    console.log('   ✅ RPC function created\n');

    // Step 4: Grant permissions
    console.log('4. Granting permissions...');
    await executeSQL('GRANT EXECUTE ON FUNCTION public.get_active_listings TO anon;');
    await executeSQL('GRANT EXECUTE ON FUNCTION public.get_active_listings TO authenticated;');
    console.log('   ✅ Permissions granted\n');

    // Step 5: Create simpler test function
    console.log('5. Creating test function get_all_active_listings...');
    const createTestFunction = `
      CREATE OR REPLACE FUNCTION public.get_all_active_listings()
      RETURNS TABLE (
          id UUID,
          title TEXT,
          is_active BOOLEAN,
          provider_id UUID,
          city TEXT,
          state TEXT
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      BEGIN
          RETURN QUERY
          SELECT
              l.id,
              l.title,
              l.is_active,
              l.provider_id,
              l.city,
              l.state
          FROM public.listings l
          WHERE l.is_active = true
          ORDER BY l.created_at DESC;
      END;
      $$;
    `;
    await executeSQL(createTestFunction);
    await executeSQL('GRANT EXECUTE ON FUNCTION public.get_all_active_listings TO anon;');
    await executeSQL('GRANT EXECUTE ON FUNCTION public.get_all_active_listings TO authenticated;');
    console.log('   ✅ Test function created\n');

    console.log('=' .repeat(50));
    console.log('✅ ALL FIXES APPLIED SUCCESSFULLY!\n');
    console.log('The following changes were made:');
    console.log('1. Removed all old RLS policies');
    console.log('2. Created new permissive policies for public viewing');
    console.log('3. Created RPC functions that bypass RLS');
    console.log('4. Granted proper permissions\n');
    console.log('Seekers should now be able to see active listings!');
    console.log('=' .repeat(50));

  } catch (error) {
    console.error('❌ Error applying fix:', error.message);
    console.error('\nPlease try applying the fix manually via the Supabase Dashboard:');
    console.log('1. Go to https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/sql');
    console.log('2. Copy the contents of fix-listings-visibility.sql');
    console.log('3. Paste and run in the SQL editor');
  }
}

applyFix();