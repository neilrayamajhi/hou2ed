import React, { useEffect, useState, createContext, useContext } from "react";
import { ActivityIndicator, View, StyleSheet, Alert } from "react-native";
import { Session, User } from "@supabase/supabase-js";
import { supabase, authHelpers } from "../lib/supabase";
import { useAuthStore } from "../state/useAuthStore";
import { theme } from "../theme";
import { transformUserData, retryWithBackoff } from "../utils/auth";
import { ERROR_MESSAGES } from "../constants/messages";
import { queryClient } from "./QueryProvider";

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
  const setReady = useAuthStore((state) => state.setReady);
  const logout = useAuthStore((state) => state.logout);

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
          console.log("[AuthProvider] Handling SIGNED_OUT event");
          setSession(null);
          setUser(null);

          // Call logout which sets isReady to false
          await logout();

          // Set isReady immediately - no delay needed
          // The Supabase client has already cleared the session
          setReady(true);
          console.log(
            "[AuthProvider] Signed out - isReady set to true for unauthenticated state",
          );

          return;
        }

        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          console.log(`[AuthProvider] Handling ${event} event`);
          console.log("   Session user ID:", session?.user?.id);
          console.log(
            "   Session user role:",
            session?.user?.user_metadata?.role,
          );
          console.log(
            "   Session expires at:",
            session?.expires_at
              ? new Date(session.expires_at * 1000).toISOString()
              : "unknown",
          );

          setSession(session);
          setUser(session?.user || null);

          if (session?.user) {
            const userData = await transformUserData(session.user);
            setStoreUser(userData);

            console.log("[AuthProvider] User data transformed and stored:");
            console.log("   ID:", userData.id);
            console.log("   Role:", userData.role);
            console.log("   Email:", userData.email);

            // CRITICAL FIX: Clear ALL queries first, then invalidate
            // This ensures no stale data from previous user persists
            console.log("[AuthProvider] Clearing query cache for user switch");
            await queryClient.cancelQueries(); // Cancel in-flight queries
            await queryClient.clear(); // Clear all cache
            console.log(
              "[AuthProvider] Cache cleared, now invalidating queries",
            );
            await queryClient.invalidateQueries(); // Mark for refetch
            console.log("[AuthProvider] Query invalidation complete");

            // Set isReady after a minimal delay for navigation to settle
            setTimeout(() => {
              setReady(true);
              console.log(
                "[AuthProvider] Set isReady to true - data fetching enabled for user:",
                userData.id,
              );
            }, 150); // Reduced from 300ms to 150ms for faster login
          }
        } else if (event === "INITIAL_SESSION") {
          // Handle initial session carefully
          if (session) {
            setSession(session);
            setUser(session.user);
            const userData = await transformUserData(session.user);
            setStoreUser(userData);

            // Invalidate queries on app load with existing session
            console.log(
              "[AuthProvider] App loaded with session - invalidating queries",
            );
            await queryClient.invalidateQueries();

            // Set isReady after initial session is loaded
            setReady(true);
            console.log(
              "[AuthProvider] Initial session loaded - isReady set to true",
            );
          } else {
            // No initial session, but don't call logout
            // Just set the state to not authenticated
            setSession(null);
            setUser(null);
            // Still set isReady to true for unauthenticated users
            setReady(true);
            console.log(
              "[AuthProvider] No initial session - isReady set to true for unauthenticated state",
            );
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

        // Set isReady after session is verified
        setReady(true);
        console.log(
          "[AuthProvider] Existing session verified - isReady set to true",
        );
      } else {
        // No existing session - set isReady for unauthenticated state
        setReady(true);
        console.log(
          "[AuthProvider] No existing session - isReady set to true for unauthenticated state",
        );
      }
    } catch (error) {
      console.error(ERROR_MESSAGES.AUTH.SESSION_ERROR, error);
      // Even on error, set isReady to prevent infinite waiting
      setReady(true);
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
