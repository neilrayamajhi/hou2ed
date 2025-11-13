/**
 * Script to manually apply saved_searches migrations
 * Run with: npx ts-node apply_saved_searches_migration.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Starting saved_searches migration...\n');

  const migrationSQL = fs.readFileSync(
    path.join(__dirname, 'supabase', 'manual_migration.sql'),
    'utf8'
  );

  // Split by statement (simple approach - split on semicolons not in strings)
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  let successCount = 0;
  let errorCount = 0;

  for (const statement of statements) {
    if (statement.trim().length === 0) continue;

    try {
      const { data, error } = await supabase.rpc('exec', {
        sql: statement + ';'
      });

      if (error) {
        // Check if it's a "already exists" error - those are OK
        if (
          error.message.includes('already exists') ||
          error.code === '42P07' ||
          error.code === '42710'
        ) {
          console.log(`⚠️  Skipped (already exists): ${statement.substring(0, 60)}...`);
        } else {
          console.error(`❌ Error: ${error.message}`);
          console.error(`   Statement: ${statement.substring(0, 100)}...`);
          errorCount++;
        }
      } else {
        console.log(`✅ Success: ${statement.substring(0, 60)}...`);
        successCount++;
      }
    } catch (err) {
      console.error(`❌ Exception: ${err}`);
      console.error(`   Statement: ${statement.substring(0, 100)}...`);
      errorCount++;
    }
  }

  console.log(`\n📊 Migration Summary:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);

  if (errorCount === 0) {
    console.log('\n🎉 Migration completed successfully!');
  } else {
    console.log('\n⚠️  Migration completed with errors. Please check the output above.');
  }
}

runMigration().catch(console.error);
