/**
 * Direct migration application script
 * This will apply the SQL migration to your database
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: "./app/.env" });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Missing Supabase credentials in app/.env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function executeMigration() {
  console.log("🔄 Applying migration...\n");

  try {
    // Execute the ALTER TABLE statements using Supabase's query API
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `
        ALTER TABLE profiles
        ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT true;
      `
    });

    if (error) {
      // RPC might not exist, try alternative method
      console.log("⚠️  Standard RPC not available, using alternative method...\n");
      
      // Try to use the REST API directly
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            ALTER TABLE profiles
            ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT true,
            ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT true;
          `
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      console.log("✅ Migration applied successfully via REST API!\n");
    } else {
      console.log("✅ Migration applied successfully!\n");
    }

    // Verify the columns exist
    console.log("🔍 Verifying migration...");
    const { data: testData, error: testError } = await supabase
      .from("profiles")
      .select("push_notifications_enabled, email_notifications_enabled")
      .limit(1);

    if (testError) {
      console.log("⚠️  Could not verify (might still be successful)");
      console.log("Error:", testError.message);
    } else {
      console.log("✅ Columns verified successfully!\n");
      console.log("New columns added:");
      console.log("  ✓ push_notifications_enabled");
      console.log("  ✓ email_notifications_enabled");
    }

    console.log("\n🎉 Migration complete!");
    console.log("\nNext steps:");
    console.log("1. Restart your app: cd app && npm start");
    console.log("2. Test notification preferences in Profile screen");
    console.log("3. They should now persist! ✨\n");

  } catch (error) {
    console.error("\n❌ Could not apply migration automatically");
    console.error("Reason:", error.message);
    console.log("\n📋 SQL to run manually in Supabase Dashboard:");
    console.log("─".repeat(60));
    console.log(`
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT true;

COMMENT ON COLUMN profiles.push_notifications_enabled IS 'Whether user wants to receive push notifications';
COMMENT ON COLUMN profiles.email_notifications_enabled IS 'Whether user wants to receive email notifications';
    `);
    console.log("─".repeat(60));
    console.log("\n1. Go to: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/editor");
    console.log("2. Click 'SQL Editor' → 'New Query'");
    console.log("3. Paste the SQL above and click 'Run'\n");
  }
}

executeMigration();

