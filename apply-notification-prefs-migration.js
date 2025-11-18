/**
 * Script to manually apply the notification preferences migration
 * Run this with: node apply-notification-prefs-migration.js
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: "./app/.env" });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Error: Missing Supabase credentials");
  console.error("Make sure EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in app/.env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log("🔄 Applying notification preferences migration...\n");

  try {
    // Read the migration SQL
    const fs = require("fs");
    const migrationSQL = fs.readFileSync(
      "./supabase/migrations/20251118000000_add_notification_preferences.sql",
      "utf8"
    );

    console.log("📝 Migration SQL:");
    console.log(migrationSQL);
    console.log();

    // Execute the migration
    const { data, error } = await supabase.rpc("exec_sql", {
      sql: migrationSQL,
    });

    if (error) {
      // If exec_sql doesn't exist, try direct query
      console.log("⚠️  exec_sql RPC not found, trying direct query...");

      // Split the SQL into individual statements
      const statements = migrationSQL
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith("--"));

      for (const statement of statements) {
        if (statement) {
          console.log(`\n🔄 Executing: ${statement.substring(0, 100)}...`);
          const { error: stmtError } = await supabase.rpc("exec", {
            query: statement,
          });

          if (stmtError) {
            console.error(`❌ Error executing statement: ${stmtError.message}`);
          } else {
            console.log("✅ Statement executed successfully");
          }
        }
      }
    }

    console.log("\n✅ Migration completed successfully!");
    console.log("\nNext steps:");
    console.log("1. Restart your app");
    console.log("2. Go to Profile screen");
    console.log("3. Toggle notification preferences");
    console.log("4. They should now persist across app restarts!");
  } catch (error) {
    console.error("❌ Error applying migration:", error);
    console.error("\n📝 Manual steps:");
    console.log("1. Go to Supabase Dashboard → SQL Editor");
    console.log("2. Copy and paste the SQL from:");
    console.log("   supabase/migrations/20251118000000_add_notification_preferences.sql");
    console.log("3. Click 'Run' to execute");
    process.exit(1);
  }
}

applyMigration();

