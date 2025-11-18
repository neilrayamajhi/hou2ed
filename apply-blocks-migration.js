/**
 * Helper script to check and guide through blocks migration
 */

const fs = require("fs");

console.log("🚫 Blocks Migration Helper\n");
console.log("=".repeat(60));

const migrationFile =
  "./supabase/migrations/20251118010000_create_blocks_table.sql";

// Check if file exists
if (!fs.existsSync(migrationFile)) {
  console.error("❌ Migration file not found!");
  console.error("Expected:", migrationFile);
  process.exit(1);
}

// Read the SQL
const sql = fs.readFileSync(migrationFile, "utf8");

console.log("\n📝 Migration SQL Preview:");
console.log("=".repeat(60));
console.log(sql.substring(0, 500) + "...\n");
console.log("=".repeat(60));

console.log("\n✅ Migration file is ready!");
console.log("\n📋 To apply this migration:");
console.log("\n1. Go to: https://supabase.com/dashboard");
console.log("2. Click 'SQL Editor' → 'New Query'");
console.log("3. Copy the entire SQL from:");
console.log("   ", migrationFile);
console.log("4. Paste and click 'Run'\n");

console.log("=".repeat(60));
console.log("✨ After applying, restart your app to use blocking!\n");

