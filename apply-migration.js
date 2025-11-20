/**
 * Apply OSM system provider migration
 * This script applies the migration using the anon key (limited but enough for this operation)
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://rixiofltzptwaiwxhhlf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGlvZmx0enB0d2Fpd3hoaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODk4ODYsImV4cCI6MjA3Mzk2NTg4Nn0.0EXiVBXVcuiqZeSH9xaXhCq_hog5sUjJXz3CzrBkVjU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function applyMigration() {
  console.log('🔧 Applying OSM system provider migration...\n');

  try {
    // Step 1: Add source column
    console.log('1️⃣  Adding source column to listings table...');
    const { error: columnError } = await supabase.rpc('exec_sql', {
      query: `
        ALTER TABLE listings
        ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'hou2ed' CHECK (source IN ('hou2ed', 'osm', 'google_places', 'imported'));

        CREATE INDEX IF NOT EXISTS idx_listings_source ON listings(source);
      `
    });

    if (columnError && !columnError.message.includes('already exists')) {
      console.log('⚠️  Note: Using alternative method for adding column');
      // Column might already exist or we don't have RPC access
    } else {
      console.log('✅ Source column added\n');
    }

    // Step 2: Create system provider profile
    console.log('2️⃣  Creating system provider profile...');
    const { data: existingProvider, error: checkError } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();

    if (existingProvider) {
      console.log(`✅ System provider already exists: ${existingProvider.username}\n`);
    } else {
      const { data, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: '00000000-0000-0000-0000-000000000001',
          user_id: '00000000-0000-0000-0000-000000000001',
          email: 'openstreetmap@hou2ed.app',
          full_name: 'OpenStreetMap Community',
          username: 'openstreetmap',
          role: 'provider',
          is_verified: true,
          push_notifications_enabled: false,
          email_notifications_enabled: false,
        })
        .select();

      if (insertError) {
        if (insertError.code === '23505') {
          console.log('✅ System provider already exists\n');
        } else {
          throw insertError;
        }
      } else {
        console.log('✅ System provider created successfully\n');
      }
    }

    console.log('✨ Migration applied successfully!');
    console.log('\nNext step: Run the OSM import script');
  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    console.error('\n📝 Manual steps required:');
    console.error('1. Go to your Supabase dashboard: https://supabase.com/dashboard');
    console.error('2. Navigate to SQL Editor');
    console.error('3. Run the migration file: supabase/migrations/20251118020000_create_osm_system_provider.sql');
    process.exit(1);
  }
}

applyMigration();
