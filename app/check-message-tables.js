/**
 * Quick diagnostic script to check if message tables exist
 * Run with: node check-message-tables.js
 */

const { createClient } = require("@supabase/supabase-js");

// You'll need to fill these in from your .env file
const SUPABASE_URL = process.env.SUPABASE_URL || "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "YOUR_ANON_KEY";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkTables() {
  console.log("🔍 Checking message tables...\n");

  // Check message_threads table
  console.log("1. Checking message_threads table:");
  const { data: threads, error: threadsError } = await supabase
    .from("message_threads")
    .select("id")
    .limit(1);

  if (threadsError) {
    console.log("❌ message_threads table: NOT FOUND");
    console.log("   Error:", threadsError.message);
  } else {
    console.log("✅ message_threads table: EXISTS");
  }

  // Check messages table
  console.log("\n2. Checking messages table:");
  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("id")
    .limit(1);

  if (messagesError) {
    console.log("❌ messages table: NOT FOUND");
    console.log("   Error:", messagesError.message);
  } else {
    console.log("✅ messages table: EXISTS");
  }

  // Check threads table (alternative name)
  console.log("\n3. Checking threads table (alternative):");
  const { data: threadsAlt, error: threadsAltError } = await supabase
    .from("threads")
    .select("id")
    .limit(1);

  if (threadsAltError) {
    console.log("❌ threads table: NOT FOUND");
  } else {
    console.log("✅ threads table: EXISTS");
  }

  console.log("\n" + "=".repeat(50));
  console.log("\n📊 Summary:");
  if (threadsError && messagesError && threadsAltError) {
    console.log("❌ NO MESSAGE TABLES FOUND!");
    console.log("\n💡 Solution: You need to create message tables in Supabase.");
    console.log("   Look for migration files in: supabase/migrations/");
  } else {
    console.log("✅ Message tables exist!");
  }
}

checkTables()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
