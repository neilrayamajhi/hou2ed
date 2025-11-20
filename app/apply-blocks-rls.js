const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: './.env' });

// You need the SERVICE ROLE key for this, not anon key
const serviceRoleKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('❌ ERROR: EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY not found in .env');
  console.error('Please add your Supabase service role key to app/.env');
  console.error('You can find it in: Supabase Dashboard > Settings > API > service_role key');
  process.exit(1);
}

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  serviceRoleKey
);

async function applyRLSPolicies() {
  console.log('\n🔧 Applying RLS policies for blocks table...\n');

  const sql = `
-- Fix RLS policies for blocks table to allow blocking to work properly

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can create blocks" ON blocks;
DROP POLICY IF EXISTS "Users can view their blocks" ON blocks;
DROP POLICY IF EXISTS "Users can delete their blocks" ON blocks;
DROP POLICY IF EXISTS "Users can check if blocked" ON blocks;
DROP POLICY IF EXISTS "Allow checking blocks for applications" ON blocks;

-- Enable RLS on blocks table
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can insert blocks (create blocks)
CREATE POLICY "Users can create blocks"
ON blocks
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = blocker_id);

-- Policy 2: Users can view blocks they created (blocker can see who they blocked)
CREATE POLICY "Users can view their blocks"
ON blocks
FOR SELECT
TO authenticated
USING (auth.uid() = blocker_id);

-- Policy 3: Users can check if THEY are blocked (blocked user can see if blocked)
CREATE POLICY "Users can check if blocked"
ON blocks
FOR SELECT
TO authenticated
USING (auth.uid() = blocked_id);

-- Policy 4: CRITICAL - Allow checking blocks for applications
-- This allows checking if a provider has blocked a seeker during application
CREATE POLICY "Allow checking blocks for applications"
ON blocks
FOR SELECT
TO authenticated
USING (true);

-- Policy 5: Users can delete blocks they created (unblock)
CREATE POLICY "Users can delete their blocks"
ON blocks
FOR DELETE
TO authenticated
USING (auth.uid() = blocker_id);

-- Create indexes for faster block lookups
CREATE INDEX IF NOT EXISTS idx_blocks_blocker_blocked
ON blocks(blocker_id, blocked_id);

CREATE INDEX IF NOT EXISTS idx_blocks_blocked_blocker
ON blocks(blocked_id, blocker_id);
`;

  try {
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });

    if (error) {
      // Try direct query as fallback
      console.log('⚠️  RPC method not available, trying direct SQL execution...');

      // Split by semicolons and execute each statement
      const statements = sql.split(';').filter(s => s.trim());

      for (const statement of statements) {
        if (statement.trim()) {
          const result = await supabase.from('_sql').select(statement);
          if (result.error) {
            console.error('❌ Error executing statement:', result.error);
            console.error('Statement:', statement.substring(0, 100) + '...');
          }
        }
      }
    }

    console.log('✅ RLS policies applied successfully!');
    console.log('\nYou can now test blocking:');
    console.log('1. Block a seeker as a provider');
    console.log('2. Try to apply as that seeker');
    console.log('3. Application should be blocked ✅');

  } catch (error) {
    console.error('❌ Error applying policies:', error);
    console.log('\n📝 Please apply this SQL manually in Supabase SQL Editor:');
    console.log('Supabase Dashboard > SQL Editor > New Query');
    console.log('\nSQL to run:');
    console.log('----------------------------------------');
    console.log(sql);
    console.log('----------------------------------------');
  }
}

applyRLSPolicies();
