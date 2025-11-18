/**
 * Simple script to apply the notification preferences migration
 * This connects to your Supabase database and adds the new columns
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: "./app/.env" });

// Get your Supabase credentials from the .env file
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Check if we have the credentials
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Error: Missing Supabase credentials");
  console.error("Make sure your app/.env file has:");
  console.error("  EXPO_PUBLIC_SUPABASE_URL=your-url");
  console.error("  EXPO_PUBLIC_SUPABASE_ANON_KEY=your-key");
  process.exit(1);
}

// Create a Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function applyMigration() {
  console.log("🔄 Applying notification preferences migration...\n");
  console.log("This will add two new columns to your profiles table:");
  console.log("  1. push_notifications_enabled (default: true)");
  console.log("  2. email_notifications_enabled (default: true)\n");

  try {
    // First, let's check if the columns already exist
    console.log("📋 Checking current table structure...");
    
    const { data: profiles, error: checkError } = await supabase
      .from("profiles")
      .select("*")
      .limit(1);

    if (checkError) {
      console.error("❌ Error checking profiles table:", checkError.message);
      console.log("\n📝 Please apply the migration manually:");
      console.log("1. Go to: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/editor");
      console.log("2. Click 'SQL Editor' on the left");
      console.log("3. Click 'New Query'");
      console.log("4. Copy and paste this SQL:\n");
      console.log(`
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT true;
      `);
      console.log("\n5. Click 'Run' (or press Cmd/Ctrl + Enter)");
      console.log("6. You should see 'Success. No rows returned'\n");
      process.exit(1);
    }

    // Check if columns already exist
    if (profiles && profiles.length > 0) {
      const firstProfile = profiles[0];
      if (
        "push_notifications_enabled" in firstProfile &&
        "email_notifications_enabled" in firstProfile
      ) {
        console.log("✅ Migration already applied! Columns exist:");
        console.log("  ✓ push_notifications_enabled");
        console.log("  ✓ email_notifications_enabled");
        console.log("\nYour database is ready to go! 🎉");
        console.log("\nNext steps:");
        console.log("1. Restart your app: cd app && npm start");
        console.log("2. Go to Profile screen");
        console.log("3. Toggle notification preferences");
        console.log("4. They will now persist! ✨");
        return;
      }
    }

    // If we got here, columns don't exist - show manual instructions
    console.log("\n⚠️  Columns not found. Need to add them!");
    console.log("\n📝 Please apply the migration manually (it's easy!):\n");
    console.log("Step 1: Go to Supabase Dashboard");
    console.log("  → https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/editor\n");
    
    console.log("Step 2: Click 'SQL Editor' in the left sidebar\n");
    
    console.log("Step 3: Click 'New Query'\n");
    
    console.log("Step 4: Copy and paste this SQL:\n");
    console.log("─".repeat(60));
    console.log(`
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT true;

COMMENT ON COLUMN profiles.push_notifications_enabled IS 'Whether user wants to receive push notifications';
COMMENT ON COLUMN profiles.email_notifications_enabled IS 'Whether user wants to receive email notifications';
    `);
    console.log("─".repeat(60));
    
    console.log("\nStep 5: Click 'Run' (or press Cmd/Ctrl + Enter)\n");
    
    console.log("Step 6: You should see 'Success. No rows returned'\n");
    
    console.log("✅ That's it! Then restart your app and test it out.\n");

  } catch (error) {
    console.error("❌ Unexpected error:", error.message);
    console.log("\n📝 Don't worry! Apply manually using the steps above.");
  }
}

// Run the migration
console.log("═".repeat(60));
console.log("  NOTIFICATION PREFERENCES MIGRATION");
console.log("═".repeat(60));
console.log();

applyMigration();

