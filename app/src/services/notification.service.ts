import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "../lib/supabase";

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, // Keep for backwards compatibility
    shouldShowBanner: true, // New API
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
    const { status: existingStatus } =
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
 * Schedule a daily notification at a specific time
 * This sets up a LOCAL notification that repeats daily
 * @param hour - Hour in 24-hour format (0-23)
 * @param minute - Minute (0-59)
 * @param userId - User ID for checking updates
 * @param userRole - User role (provider or seeker)
 */
export async function scheduleDailyNotification(
  hour: number,
  minute: number,
  userId: string,
  userRole: "provider" | "seeker" = "seeker",
): Promise<boolean> {
  try {
    // ONLY schedule notifications for providers, not seekers
    if (userRole !== "provider") {
      console.log(
        "⚠️ Notification scheduling is only for providers. Skipping for seeker.",
      );
      return false;
    }

    // Cancel all existing scheduled notifications first
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log("✅ Cancelled all existing scheduled notifications");

    // Create a Date object for the scheduled time TODAY
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hour);
    scheduledTime.setMinutes(minute);
    scheduledTime.setSeconds(0);
    scheduledTime.setMilliseconds(0);

    // If the time has already passed today, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
      console.log(
        `⏭️ Time ${hour}:${minute} already passed today, scheduling for tomorrow`,
      );
    }

    console.log(`📅 Scheduling daily notification for ${hour}:${minute}`);
    console.log(`   First trigger: ${scheduledTime.toLocaleString()}`);
    console.log(`   User role: PROVIDER (bed availability reminder)`);

    // Provider notification content ONLY
    const notificationContent = {
      title: "🏠 Recheck Your Bed Availability",
      body: "Update your available bed counts to keep seekers informed. Tap to go to the updater.",
      data: {
        screen: "AvailabilityUpdater",
        userId: userId,
        type: "daily_availability_reminder",
        userRole: "provider",
      },
    };

    // Schedule the notification to repeat daily
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        ...notificationContent,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        hour: hour,
        minute: minute,
        repeats: true, // This makes it repeat daily
      },
    });

    console.log(
      `✅ Daily notification scheduled successfully! ID: ${notificationId}`,
    );
    console.log(
      `   Will notify ${userRole} every day at ${hour}:${String(minute).padStart(2, "0")}`,
    );

    // Also schedule a TEST notification in 10 seconds to verify it works (PROVIDERS ONLY)
    if (process.env.NODE_ENV === "development") {
      const testId = await Notifications.scheduleNotificationAsync({
        content: {
          title: "🧪 Test Notification",
          body: "Your daily availability reminder will work like this!",
          data: notificationContent.data,
          sound: true,
        },
        trigger: {
          seconds: 10, // Fire in 10 seconds
        },
      });
      console.log(
        `🧪 Test notification scheduled for 10 seconds from now (ID: ${testId})`,
      );
    }

    // Wait a bit for notifications to register in the system
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify notifications were actually scheduled
    const allNotifications =
      await Notifications.getAllScheduledNotificationsAsync();
    console.log(
      `📋 Verification: ${allNotifications.length} notification(s) are now scheduled`,
    );
    allNotifications.forEach((notif, index) => {
      console.log(
        `   ${index + 1}. ${notif.content.title} - Trigger: ${JSON.stringify(notif.trigger)}`,
      );
    });

    if (allNotifications.length === 0) {
      console.error("❌ ERROR: No notifications found after scheduling!");
      console.error(
        "   This usually means you're using Expo Go, which doesn't support repeating calendar notifications.",
      );
      console.error(
        "   Solution: Create a development build with 'eas build --profile development'",
      );
      console.error("   See EXPO_GO_NOTIFICATION_LIMITATION.md for details.");
      return false;
    }

    return true;
  } catch (error) {
    console.error("❌ Error scheduling daily notification:", error);
    return false;
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllScheduledNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log("✅ All scheduled notifications cancelled");
  } catch (error) {
    console.error("Error cancelling notifications:", error);
  }
}

/**
 * Get all currently scheduled notifications (for debugging)
 */
export async function getScheduledNotifications(): Promise<
  Notifications.NotificationRequest[]
> {
  try {
    const notifications =
      await Notifications.getAllScheduledNotificationsAsync();
    console.log(`📋 Found ${notifications.length} scheduled notifications:`);
    notifications.forEach((notif, index) => {
      console.log(`   ${index + 1}. ID: ${notif.identifier}`);
      console.log(`      Content: ${notif.content.title}`);
      console.log(`      Trigger: ${JSON.stringify(notif.trigger)}`);
    });
    return notifications;
  } catch (error) {
    console.error("Error getting scheduled notifications:", error);
    return [];
  }
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
