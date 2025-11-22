import React, {
  useEffect,
  useState,
  useRef,
  createContext,
  useContext,
} from "react";
import { ActivityIndicator, View, StyleSheet, Alert } from "react-native";
import { Session, User } from "@supabase/supabase-js";
import * as Notifications from "expo-notifications";
import { supabase, authHelpers } from "../lib/supabase";
import { useAuthStore } from "../state/useAuthStore";
import { theme } from "../theme";
import { transformUserData, retryWithBackoff } from "../utils/auth";
import { ERROR_MESSAGES } from "../constants/messages";
import { queryClient } from "./QueryProvider";
import {
  initializePushNotifications,
  checkApplicationUpdates,
  markApplicationsAsNotified,
  sendLocalNotification,
} from "../services/notification.service";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const setStoreUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);

  // Use ref to persist across re-renders
  const hasHandledInitialNotification = useRef(false);

  // Set up notification listener for daily checks
  useEffect(() => {
    console.log("[AuthProvider] Setting up notification listener");

    // Listen for notification responses (when user taps on notification)
    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener(
        async (response) => {
          console.log("[AuthProvider] 📬 Notification response received");
          console.log(
            "  Has handled initial?",
            hasHandledInitialNotification.current,
          );

          // Ignore the very first notification response (stale data from before app launch)
          if (!hasHandledInitialNotification.current) {
            console.log(
              "📬 [AuthProvider] ✋ IGNORING initial notification on app launch",
            );
            hasHandledInitialNotification.current = true;
            return;
          }

          const data = response.notification.request.content.data;
          console.log("📬 [AuthProvider] Processing notification:", data);

          // Only process our specific notification types
          if (!data || !data.type) {
            console.log("⚠️ Ignoring notification with no type");
            return;
          }

          // Handle provider availability reminder ONLY
          if (
            data.type === "daily_availability_reminder" &&
            data.userRole === "provider"
          ) {
            console.log("🏠 Provider availability reminder - navigating...");
            // Navigation will happen in RootNavigator
            return; // Let navigation system handle it
          }

          // SEEKER NOTIFICATIONS DISABLED
          // Notifications are only for providers (bed availability reminders)
          // Seekers can check their applications manually in the app
          if (data.type === "daily_application_check") {
            console.log("⚠️ Seeker notifications are disabled. Ignoring.");
            return;
          }
        },
      );

    // Listen for notifications received while app is in foreground
    const notificationSubscription =
      Notifications.addNotificationReceivedListener(async (notification) => {
        const data = notification.request.content.data;
        console.log("📨 Notification received while in foreground:", data);
        console.log("   Title:", notification.request.content.title);
        console.log("   Body:", notification.request.content.body);
        console.log("   Time:", new Date().toLocaleTimeString());

        // For provider reminders in foreground, just log (notification already shown)
        if (
          data.type === "daily_availability_reminder" &&
          data.userRole === "provider"
        ) {
          console.log(
            "🏠 Provider availability reminder shown (app in foreground)",
          );
          console.log("   ✅ Notification should be visible now!");
          return;
        }

        // SEEKER NOTIFICATIONS DISABLED
        // Notifications are only for providers (bed availability reminders)
        if (data.type === "daily_application_check") {
          console.log("⚠️ Seeker notifications are disabled. Ignoring.");
          return;
        }
      });

    return () => {
      console.log("[AuthProvider] Cleaning up notification listeners");
      responseSubscription.remove();
      notificationSubscription.remove();
    };
  }, []);

  useEffect(() => {
    // Check for existing session
    checkSession();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(
          "Auth event:",
          event,
          "Session:",
          session ? "exists" : "null",
        );

        // Handle different auth events
        if (event === "SIGNED_OUT") {
          setSession(null);
          setUser(null);
          await logout();
          return;
        }

        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          console.log("[AuthProvider] SIGNED_IN event - user logged in");

          setSession(session);
          setUser(session?.user || null);

          if (session?.user) {
            console.log(
              "[AuthProvider] 🔐 SIGNED_IN event - transforming user data",
            );
            const userData = await transformUserData(session.user);
            console.log("[AuthProvider] ✅ User data transformed:", {
              id: userData.id,
              email: userData.email,
              role: userData.role,
            });

            setStoreUser(userData);
            console.log("[AuthProvider] ✅ User set in auth store");

            // Initialize push notifications (register token only, don't schedule)
            console.log(
              "[AuthProvider] Initializing push notifications (token only)",
            );
            initializePushNotifications(session.user.id).catch((error) => {
              console.error(
                "[AuthProvider] Failed to initialize push notifications:",
                error,
              );
            });

            // Invalidate all queries after login so they refetch with new user
            console.log(
              "[AuthProvider] Login successful - invalidating all queries to refetch fresh data",
            );
            await queryClient.invalidateQueries();
            console.log("[AuthProvider] Query invalidation complete");
            console.log(
              "[AuthProvider] 🎯 User should now be authenticated and navigation should show Tabs screen",
            );
          }
        } else if (event === "INITIAL_SESSION") {
          // Handle initial session carefully
          if (session) {
            setSession(session);
            setUser(session.user);
            const userData = await transformUserData(session.user);
            setStoreUser(userData);

            // Initialize push notifications for existing session
            console.log(
              "[AuthProvider] Initializing push notifications for existing session",
            );
            initializePushNotifications(session.user.id).catch((error) => {
              console.error(
                "[AuthProvider] Failed to initialize push notifications:",
                error,
              );
            });

            // Invalidate queries on app load with existing session
            console.log(
              "[AuthProvider] App loaded with session - invalidating queries",
            );
            await queryClient.invalidateQueries();
          } else {
            // No initial session, but don't call logout
            // Just set the state to not authenticated
            setSession(null);
            setUser(null);
          }
        }
      },
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const checkSession = async () => {
    try {
      setLoading(true);
      // Retry session check with exponential backoff
      const { session: existingSession, error } = await retryWithBackoff(() =>
        authHelpers.getSession(),
      );

      if (error) {
        console.error(ERROR_MESSAGES.AUTH.SESSION_ERROR, error);

        // If refresh token is invalid, clear storage and start fresh
        if (
          error.message?.includes("Invalid Refresh Token") ||
          error.message?.includes("Refresh Token Not Found")
        ) {
          console.log(
            "[AuthProvider] Invalid refresh token detected - clearing storage and starting fresh",
          );
          await authHelpers.signOut();
          return;
        }
      }

      if (existingSession) {
        setSession(existingSession);
        setUser(existingSession.user);

        // Update store with user data
        const userData = await transformUserData(existingSession.user);
        setStoreUser(userData);

        // Invalidate queries to fetch fresh data for the session
        console.log(
          "[AuthProvider] Existing session found - invalidating queries",
        );
        await queryClient.invalidateQueries();
      }
    } catch (error: any) {
      console.error(ERROR_MESSAGES.AUTH.SESSION_ERROR, error);

      // If refresh token is invalid, clear storage and start fresh
      if (
        error?.message?.includes("Invalid Refresh Token") ||
        error?.message?.includes("Refresh Token Not Found")
      ) {
        console.log(
          "[AuthProvider] Invalid refresh token detected - clearing storage and starting fresh",
        );
        try {
          await authHelpers.signOut();
        } catch (signOutError) {
          console.error("Error clearing invalid session:", signOutError);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await authHelpers.signOut();
      if (error) throw error;
      logout();
    } catch (error) {
      console.error(ERROR_MESSAGES.AUTH.SIGN_OUT_ERROR, error);
      Alert.alert("Error", ERROR_MESSAGES.AUTH.SIGN_OUT_ERROR);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.gold} />
      </View>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000",
  },
});
