import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import HomeScreen from "../screens/Home/HomeScreen";
import SearchScreen from "../screens/Search/SearchScreen";
import InboxScreen from "../screens/Messages/InboxScreen";
import SavedScreen from "../screens/Saved/SavedScreen";
import ProfileScreen from "../screens/Profile/ProfileScreen";

// Create a bottom tab navigator - this is what creates the tab bar at the bottom
const Tab = createBottomTabNavigator();




// Main TabNavigator component that sets up all 5 tabs
export default function TabNavigator() {
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
      {/* Each Tab.Screen creates one tab */}
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
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
