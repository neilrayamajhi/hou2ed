const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './app/.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in app/.env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkNotificationTime() {
  try {
    console.log("🔍 Checking notification_time column...\n");

    // Get the current user's profile (you'll need to provide a user ID)
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, role, notification_time")
      .eq("role", "provider")
      .limit(5);

    if (profileError) {
      console.error("❌ Error fetching profiles:", profileError);
      return;
    }

    if (!profiles || profiles.length === 0) {
      console.log("⚠️  No provider profiles found");
      return;
    }

    console.log("📋 Provider profiles:\n");
    profiles.forEach((profile) => {
      console.log(`  User ID: ${profile.id}`);
      console.log(`  Email: ${profile.email || "N/A"}`);
      console.log(`  Role: ${profile.role}`);
      console.log(`  Notification Time: ${profile.notification_time || "NOT SET"}`);
      console.log("");
    });

    // Try to update one
    console.log("\n🧪 Testing save functionality...");
    const testUserId = profiles[0].id;
    const testTime = "20:00:00";

    const { data: updateData, error: updateError } = await supabase
      .from("profiles")
      .update({ notification_time: testTime })
      .eq("id", testUserId)
      .select();

    if (updateError) {
      console.error("❌ Error updating:", updateError);
    } else {
      console.log("✅ Save successful:", updateData);
    }

    // Try to read it back
    console.log("\n🧪 Testing load functionality...");
    const { data: loadData, error: loadError } = await supabase
      .from("profiles")
      .select("notification_time")
      .eq("id", testUserId)
      .single();

    if (loadError) {
      console.error("❌ Error loading:", loadError);
    } else {
      console.log("✅ Load successful:", loadData);
    }
  } catch (error) {
    console.error("❌ Exception:", error);
  }
}

checkNotificationTime();
