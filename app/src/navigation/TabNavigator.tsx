import React, { useEffect } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import HomeScreen from "../screens/Home/HomeScreen";
import SearchScreen from "../screens/Search/SearchScreen";
import InboxScreen from "../screens/Messages/InboxScreen";
import SavedScreen from "../screens/Saved/SavedScreen";
import ProfileScreen from "../screens/Profile/ProfileScreen";
import ProviderDashboard from "../screens/Provider/ProviderDashboard";
import { useAuthStore } from "../state/useAuthStore";
import { RootStackNavigationProp } from "./types";
import { useI18n } from "../i18n";

// Create a bottom tab navigator - this is what creates the tab bar at the bottom
const Tab = createBottomTabNavigator();

// Main TabNavigator component that sets up all 5 tabs
export default function TabNavigator() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isProvider = user?.role === "provider";
  const i18n = useI18n();

  useEffect(() => {
    // If user is not authenticated, redirect to auth flow
    if (!isAuthenticated || !user) {
      navigation.reset({
        index: 0,
        routes: [{ name: "RoleSelection" }],
      });
    }
  }, [isAuthenticated, user, navigation]);

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
      }}
    >
      {/* Provider-specific tabs */}
      {isProvider ? (
        <>
          <Tab.Screen
            name="Dashboard"
            component={ProviderDashboard}
            options={{
              tabBarLabel: i18n.t("navigation.dashboard"),
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
              tabBarLabel: i18n.t("navigation.messages"),
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
              tabBarLabel: i18n.t("navigation.profile"),
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
              tabBarLabel: i18n.t("navigation.home"),
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="home-outline" size={size} color={color} />
              ),
              tabBarAccessibilityLabel: "Home tab",
            }}
          />
          <Tab.Screen
            name="Search"
            component={SearchScreen}
            options={{
              tabBarLabel: i18n.t("navigation.search"),
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="search-outline" size={size} color={color} />
              ),
              tabBarAccessibilityLabel: "Search listings tab",
            }}
          />
          <Tab.Screen
            name="Messages"
            component={InboxScreen}
            options={{
              tabBarLabel: i18n.t("navigation.messages"),
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
              tabBarLabel: i18n.t("navigation.saved"),
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
              tabBarLabel: i18n.t("navigation.profile"),
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
