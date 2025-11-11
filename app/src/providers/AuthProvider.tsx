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
          // Don't trigger full logout flow on SIGNED_OUT event
          // This can happen on initial load when there's no session
          // Just clear the local state without clearing caches or calling logout
          console.log("📝 Auth event SIGNED_OUT - clearing local session only");
          setSession(null);
          setUser(null);
          // Don't call logout() here as it causes unnecessary cache clearing on startup
          return;
        }

        if (event === "SIGNED_IN") {
          // CRITICAL: Clear all caches on sign in to prevent stale data
          // This is especially important when switching between account types
          console.log("🔄 User signed in - clearing all caches...");

          // Cancel any in-flight queries
          await queryClient.cancelQueries();

          // Clear entire cache to prevent any stale data from previous session
          await queryClient.clear();

          // Set new session and user
          setSession(session);
          setUser(session?.user || null);

          if (session?.user) {
            const userData = transformUserData(session.user);
            setStoreUser(userData);

            // Small delay to ensure auth token propagation
            setTimeout(() => {
              console.log("🔄 Session ready - data will be fetched fresh");
              // No need to manually invalidate - queries will run fresh since cache was cleared
            }, 500);
          }
        }

        if (event === "TOKEN_REFRESHED") {
          // Token refresh doesn't need cache clearing
          setSession(session);
          setUser(session?.user || null);

          if (session?.user) {
            const userData = transformUserData(session.user);
            setStoreUser(userData);
          }
        } else if (event === "INITIAL_SESSION") {
          // Handle initial session carefully
          if (session) {
            setSession(session);
            setUser(session.user);
            const userData = transformUserData(session.user);
            setStoreUser(userData);
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
      }

      if (existingSession) {
        setSession(existingSession);
        setUser(existingSession.user);

        // Update store with user data
        const userData = transformUserData(existingSession.user);
        setStoreUser(userData);
      }
    } catch (error) {
      console.error(ERROR_MESSAGES.AUTH.SESSION_ERROR, error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      // First, cancel all active queries to prevent race conditions
      await queryClient.cancelQueries();

      // Clear all React Query cache before signing out
      await queryClient.clear();

      // Reset all queries to ensure no stale data persists
      await queryClient.resetQueries();

      // Clear auth store state
      logout();

      // Now sign out from Supabase
      const { error } = await authHelpers.signOut();
      if (error) throw error;

      // Clear local state
      setSession(null);
      setUser(null);

      console.log("✅ Sign out complete: cache cleared, state reset");
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
