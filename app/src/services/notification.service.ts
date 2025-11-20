import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "../lib/supabase";

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register for push notifications and get the Expo push token
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    // Request permissions
    const { status: existingStatus} =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("❌ Failed to get push notification permissions");
      return null;
    }

    // Get the Expo push token
    // For development, push notifications are optional
    // For production builds, add EXPO_PUBLIC_PROJECT_ID to .env.local
    let tokenData;
    try {
      const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
      if (projectId) {
        tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      } else {
        // Try without projectId (works in Expo Go)
        tokenData = await Notifications.getExpoPushTokenAsync();
      }
      console.log("✅ Got Expo push token:", tokenData.data);
    } catch (error: any) {
      // Push notifications are optional - gracefully handle failure
      console.log(
        "ℹ️ Push notifications not available (missing projectId - this is OK for development)",
      );
      console.log(
        "   To enable: run 'eas init' or add EXPO_PUBLIC_PROJECT_ID to .env.local",
      );
      return null;
    }

    // Android specific channel setup
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#D4AF37",
      });
    }

    return tokenData.data;
  } catch (error) {
    console.error("Error registering for push notifications:", error);
    return null;
  }
}

/**
 * Save push token to user's profile in database
 */
export async function savePushToken(
  userId: string,
  pushToken: string,
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("profiles")
      .update({ push_token: pushToken })
      .eq("id", userId);

    if (error) {
      console.error("Error saving push token:", error);
      return false;
    }

    console.log("✅ Push token saved to profile");
    return true;
  } catch (error) {
    console.error("Error saving push token:", error);
    return false;
  }
}

/**
 * Initialize push notifications for the current user
 */
export async function initializePushNotifications(
  userId: string,
): Promise<void> {
  try {
    const token = await registerForPushNotifications();
    if (token) {
      await savePushToken(userId, token);
      console.log("✅ Push notifications fully initialized");
    } else {
      console.log(
        "ℹ️ Push notifications skipped - app will use local notifications only",
      );
    }
  } catch (error) {
    console.error("Error initializing push notifications:", error);
    console.log("   App will continue without push notifications");
  }
}

/**
 * Check for application status changes and return updates
 */
export interface ApplicationUpdate {
  id: string;
  listing_title: string;
  old_status: string;
  new_status: "approved" | "rejected";
}

export async function checkApplicationUpdates(
  userId: string,
): Promise<ApplicationUpdate[]> {
  try {
    // Get applications where status is approved or rejected
    // AND last_notified_status is different (or null)
    const { data: applications, error } = await supabase
      .from("applications")
      .select(
        `
        id,
        status,
        last_notified_status,
        listing:listings (
          title
        )
      `,
      )
      .eq("seeker_id", userId)
      .in("status", ["approved", "rejected"])
      .is("deleted_at", null);

    if (error) {
      console.error("Error checking application updates:", error);
      return [];
    }

    if (!applications || applications.length === 0) {
      return [];
    }

    // Filter to only include applications where status has changed
    const updates: ApplicationUpdate[] = applications
      .filter((app) => {
        // Include if never notified or status changed
        return (
          !app.last_notified_status || app.last_notified_status !== app.status
        );
      })
      .map((app) => ({
        id: app.id,
        listing_title: app.listing?.title || "Unknown Listing",
        old_status: app.last_notified_status || "unknown",
        new_status: app.status as "approved" | "rejected",
      }));

    return updates;
  } catch (error) {
    console.error("Error checking application updates:", error);
    return [];
  }
}

/**
 * Mark applications as notified by updating last_notified_status
 */
export async function markApplicationsAsNotified(
  applicationIds: string[],
): Promise<boolean> {
  try {
    // For each application, update last_notified_status to current status
    const promises = applicationIds.map(async (id) => {
      // First get the current status
      const { data: app } = await supabase
        .from("applications")
        .select("status")
        .eq("id", id)
        .single();

      if (!app) return false;

      // Then update last_notified_status to match current status
      const { error } = await supabase
        .from("applications")
        .update({ last_notified_status: app.status })
        .eq("id", id);

      return !error;
    });

    const results = await Promise.all(promises);
    return results.every((r) => r);
  } catch (error) {
    console.error("Error marking applications as notified:", error);
    return false;
  }
}

/**
 * Send local notification (for testing)
 */
export async function sendLocalNotification(
  title: string,
  body: string,
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { screen: "ApplicationsList" },
    },
    trigger: null, // Send immediately
  });
}

/**
 * Get user's notification time preference
 */
export async function getNotificationTime(
  userId: string,
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("notification_time")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching notification time:", error);
      return null;
    }

    if (!data) {
      return "08:00:00"; // Default time
    }

    return data.notification_time || "08:00:00";
  } catch (error) {
    console.error("Error fetching notification time:", error);
    return null;
  }
}

/**
 * Save user's notification time preference
 */
export async function saveNotificationTime(
  userId: string,
  time: string,
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("profiles")
      .update({ notification_time: time })
      .eq("id", userId);

    if (error) {
      console.error("Error saving notification time:", error);
      return false;
    }

    console.log("✅ Notification time preference saved:", time);
    return true;
  } catch (error) {
    console.error("Error saving notification time:", error);
    return false;
  }
}

