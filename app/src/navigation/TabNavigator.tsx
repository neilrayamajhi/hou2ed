import React, { useEffect } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import HomeScreen from "../screens/Home/HomeScreen";
import InboxScreen from "../screens/Messages/InboxScreen";
import SavedScreen from "../screens/Saved/SavedScreen";
import ProfileScreen from "../screens/Profile/ProfileScreen";
import ProviderDashboard from "../screens/Provider/ProviderDashboard";
import { useAuthStore } from "../state/useAuthStore";
import { RootStackNavigationProp } from "./types";

// Create a bottom tab navigator - this is what creates the tab bar at the bottom
const Tab = createBottomTabNavigator();

// Main TabNavigator component that sets up all 5 tabs
export default function TabNavigator() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isProvider = user?.role === "provider";

  useEffect(() => {
    // If user is not authenticated, redirect to auth flow
    // Only check on mount and when authentication status changes
    if (!isAuthenticated || !user) {
      navigation.reset({
        index: 0,
        routes: [{ name: "RoleSelection" }],
      });
    }
  }, [isAuthenticated, user?.id, navigation]); // Changed 'user' to 'user?.id' to prevent infinite resets

  // Log which tabs are being shown (only when user ID or role changes, not on every render)
  useEffect(() => {
    console.log(
      "[TabNavigator] Rendering tabs for:",
      isProvider ? "PROVIDER" : "SEEKER",
      "user:",
      user?.id,
    );
  }, [isProvider, user?.id]); // Changed from 'user' to 'user?.id' to prevent unnecessary re-renders

  // Don't render anything if user is not set or role doesn't match expected state
  if (!user) {
    console.log("[TabNavigator] No user, not rendering tabs");
    return null;
  }

  return (
    <Tab.Navigator
      screenOptions={{
        // Black background for tab bar
        tabBarStyle: {
          backgroundColor: "#000000",
          borderTopWidth: 0,
        },
        // Gold color when tab is active, white when inactive
        tabBarActiveTintColor: "#D4AF37",
        tabBarInactiveTintColor: "#FFFFFF",
        // Hide the header for all tabs (we'll create custom headers later)
        headerShown: false,
        // Don't lazy load screens - mount them immediately
        lazy: false,
      }}
      // Force recreation when user changes
      key={`tabs-${user.id}`}
    >
      {/* Provider-specific tabs */}
      {isProvider ? (
        <>
          <Tab.Screen
            name="Dashboard"
            component={ProviderDashboard}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="grid-outline" size={size} color={color} />
              ),
              tabBarAccessibilityLabel: "Provider dashboard tab",
            }}
          />
          <Tab.Screen
            name="Messages"
            component={InboxScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="chatbubble-outline" size={size} color={color} />
              ),
              tabBarAccessibilityLabel: "Messages tab",
            }}
          />
          <Tab.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="person-outline" size={size} color={color} />
              ),
              tabBarAccessibilityLabel: "Profile tab",
            }}
          />
        </>
      ) : (
        <>
          {/* Seeker tabs */}
          <Tab.Screen
            name="Home"
            component={HomeScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="home-outline" size={size} color={color} />
              ),
              tabBarAccessibilityLabel: "Home tab with search and map",
            }}
          />
          <Tab.Screen
            name="Messages"
            component={InboxScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="chatbubble-outline" size={size} color={color} />
              ),
              tabBarAccessibilityLabel: "Messages tab",
            }}
          />
          <Tab.Screen
            name="Saved"
            component={SavedScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="bookmark-outline" size={size} color={color} />
              ),
              tabBarAccessibilityLabel: "Saved listings tab",
            }}
          />
          <Tab.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="person-outline" size={size} color={color} />
              ),
              tabBarAccessibilityLabel: "Profile tab",
            }}
          />
        </>
      )}
    </Tab.Navigator>
  );
}

// Basic styles for our placeholder screens
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000", // Black background
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    color: "#D4AF37", // Gold text
    fontSize: 24,
    fontWeight: "bold",
  },
});
