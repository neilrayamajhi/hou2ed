// Supabase Edge Function for sending application status notifications
// This function runs hourly and sends notifications to users based on their preferred time

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_API = "https://exp.host/--/api/v2/push/send";

interface ApplicationUpdate {
  id: string;
  seeker_id: string;
  listing_title: string;
  status: "approved" | "rejected";
}

interface Notification {
  to: string;
  title: string;
  body: string;
  data: {
    screen: string;
  };
}

serve(async (req) => {
  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("🔔 Starting hourly notification check...");

    // Get current hour in UTC
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();

    // Only process at the top of the hour (first 5 minutes)
    if (currentMinute > 5) {
      console.log(`Skipping - nowt at top of hour (current minute: ${currentMinute})`);
      return new Response(
        JSON.stringify({ message: "Not at top of hour, skipping" }),
        { status: 200 }
      );
    }

    console.log(`Current UTC time: ${currentHour}:${currentMinute}`);

    // Get all users whose notification time matches the current hour
    // notification_time is stored as TIME (HH:MM:SS), we extract the hour
    const { data: eligibleUsers, error: usersError } = await supabase
      .from("profiles")
      .select("id, push_token, notification_time")
      .not("push_token", "is", null)
      .not("notification_time", "is", null);

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return new Response(JSON.stringify({ error: usersError.message }), {
        status: 500,
      });
    }

    if (!eligibleUsers || eligibleUsers.length === 0) {
      console.log("No users with push tokens found");
      return new Response(
        JSON.stringify({ message: "No users with push tokens" }),
        { status: 200 }
      );
    }

    // Filter users whose notification hour matches current hour
    const usersToNotify = eligibleUsers.filter((user) => {
      if (!user.notification_time) return false;

      // notification_time format: "HH:MM:SS"
      const [hour] = user.notification_time.split(":");
      const userHour = parseInt(hour, 10);

      return userHour === currentHour;
    });

    console.log(`Found ${usersToNotify.length} users with notification time at hour ${currentHour}`);

    if (usersToNotify.length === 0) {
      console.log("No users scheduled for this hour");
      return new Response(
        JSON.stringify({ message: "No users scheduled for this hour" }),
        { status: 200 }
      );
    }

    // For each user, check their applications for status changes
    const userIds = usersToNotify.map((u) => u.id);

    const { data: applications, error: appsError } = await supabase
      .from("applications")
      .select(
        `
        id,
        seeker_id,
        status,
        last_notified_status,
        listing:listings (
          title
        )
      `
      )
      .in("seeker_id", userIds)
      .in("status", ["approved", "rejected"])
      .is("deleted_at", null);

    if (appsError) {
      console.error("Error fetching applications:", appsError);
      return new Response(JSON.stringify({ error: appsError.message }), {
        status: 500,
      });
    }

    if (!applications || applications.length === 0) {
      console.log("No applications to process for these users");
      return new Response(
        JSON.stringify({ message: "No applications to process" }),
        { status: 200 }
      );
    }

    // Get all approved/rejected applications (for testing - sends every time)
    const updatedApplications: ApplicationUpdate[] = applications.map((app) => ({
      id: app.id,
      seeker_id: app.seeker_id,
      listing_title: app.listing?.title || "Unknown Listing",
      status: app.status as "approved" | "rejected",
    }));

    if (updatedApplications.length === 0) {
      console.log("No status changes to notify");
      return new Response(
        JSON.stringify({ message: "No status changes to notify" }),
        { status: 200 }
      );
    }

    console.log(
      `Found ${updatedApplications.length} applications with status changes`
    );

    // Group applications by seeker
    const seekerUpdates = new Map<string, ApplicationUpdate[]>();
    for (const app of updatedApplications) {
      if (!seekerUpdates.has(app.seeker_id)) {
        seekerUpdates.set(app.seeker_id, []);
      }
      seekerUpdates.get(app.seeker_id)!.push(app);
    }

    // Send notifications to each seeker
    const notifications: Notification[] = [];
    const applicationIdsToUpdate: string[] = [];

    for (const [seekerId, updates] of seekerUpdates.entries()) {
      // Get user's push token from usersToNotify
      const userProfile = usersToNotify.find((u) => u.id === seekerId);

      if (!userProfile?.push_token) {
        console.log(`Skipping seeker ${seekerId} - no push token`);
        continue;
      }

      // Count approved and rejected
      const approved = updates.filter((u) => u.status === "approved").length;
      const rejected = updates.filter((u) => u.status === "rejected").length;

      // Create summary message
      const parts: string[] = [];
      if (approved > 0) parts.push(`${approved} approved`);
      if (rejected > 0) parts.push(`${rejected} rejected`);
      const summary = parts.join(", ");

      // Add notification to send
      notifications.push({
        to: userProfile.push_token,
        title: "Application Updates",
        body: `You have ${updates.length} application update${
          updates.length > 1 ? "s" : ""
        }: ${summary}`,
        data: {
          screen: "ApplicationsList",
        },
      });

      // Track which applications to mark as notified
      applicationIdsToUpdate.push(...updates.map((u) => u.id));
    }

    // Send all notifications to Expo
    if (notifications.length > 0) {
      console.log(`Sending ${notifications.length} notifications to Expo...`);

      const response = await fetch(EXPO_PUSH_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(notifications),
      });

      const result = await response.json();
      console.log("Expo push response:", result);

      // Mark applications as notified
      for (const appId of applicationIdsToUpdate) {
        // Get current status
        const { data: app } = await supabase
          .from("applications")
          .select("status")
          .eq("id", appId)
          .single();

        if (app) {
          // Update last_notified_status to current status
          await supabase
            .from("applications")
            .update({ last_notified_status: app.status })
            .eq("id", appId);
        }
      }

      console.log(
        `✅ Sent ${notifications.length} notifications and updated ${applicationIdsToUpdate.length} applications`
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationsSent: notifications.length,
        applicationsUpdated: applicationIdsToUpdate.length,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in notification job:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
});
