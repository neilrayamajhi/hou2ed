import React, { useEffect } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import HomeScreen from "../screens/Home/HomeScreen";
import InboxScreen from "../screens/Messages/InboxScreen";
import SavedScreen from "../screens/Saved/SavedScreen";
import ProfileScreen from "../screens/Profile/ProfileScreen";
import DashboardStack from "./DashboardStack";
import AdminDashboard from "../screens/Admin/AdminDashboard";
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
  const isAdmin = user?.role === "admin";

  console.log("📱 [TabNavigator] =========== RENDERING ===========");
  console.log("   User:", user?.email || "NO USER");
  console.log("   User ID:", user?.id || "NO ID");
  console.log("   Role:", user?.role || "NO ROLE");
  console.log("   Is Provider:", isProvider);
  console.log("   Is Authenticated:", isAuthenticated);
  console.log("   Initial Route:", isProvider ? "Dashboard" : "Home");
  console.log("📱 [TabNavigator] =====================================");

  useEffect(() => {
    console.log("📱 [TabNavigator] Mounted");
    console.log("   Rendering tabs for:", isProvider ? "PROVIDER" : "SEEKER");

    return () => {
      console.log("📱 [TabNavigator] Unmounting");
    };
  }, []);

  useEffect(() => {
    // If user is not authenticated, redirect to auth flow
    if (!isAuthenticated || !user) {
      console.log(
        "⚠️ [TabNavigator] User not authenticated, redirecting to RoleSelection",
      );
      navigation.reset({
        index: 0,
        routes: [{ name: "RoleSelection" }],
      });
    }
  }, [isAuthenticated, user, navigation]);

  console.log(
    "📱 [TabNavigator] About to render Tab.Navigator with",
    isProvider ? "3 provider tabs" : "4 seeker tabs",
  );

  return (
    <Tab.Navigator
      initialRouteName={
        isAdmin ? "Dashboard" : isProvider ? "Dashboard" : "Home"
      }
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
      }}
    >
      {/* Admin-specific tabs */}
      {isAdmin ? (
        <Tab.Screen
          name="Dashboard"
          component={AdminDashboard}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="grid-outline" size={size} color={color} />
            ),
            tabBarAccessibilityLabel: "Admin dashboard tab",
          }}
        />
      ) : isProvider ? (
        <>
          <Tab.Screen
            name="Dashboard"
            component={DashboardStack}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="grid-outline" size={size} color={color} />
              ),
              tabBarAccessibilityLabel: "Provider dashboard tab",
              // Keep tab bar visible for all provider screens
              tabBarStyle: {
                backgroundColor: "#000000",
                borderTopWidth: 0,
              },
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
