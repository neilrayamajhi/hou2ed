import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Styleguide from "../screens/Dev/Styleguide";
import HomeScreen from "../screens/Home/HomeScreen";
import SearchScreen from "../screens/Search/SearchScreen";
import InboxScreen from "../screens/Messages/InboxScreen";
import SavedScreen from "../screens/Saved/SavedScreen";
import ProfileScreen from "../screens/Profile/ProfileScreen";
// import StressTest from '../components/ui/__tests__/StressTest';
// import OnboardingTest from '../screens/Onboarding/__tests__/OnboardingTest';

// Temporary placeholder components for testing
const StressTest = () => null;
const OnboardingTest = () => null;

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
      {/* Development-only tabs for testing */}
      {__DEV__ && (
        <>
          <Tab.Screen
            name="Dev"
            component={Styleguide}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="code-outline" size={size} color={color} />
              ),
              tabBarLabel: "UI Kit",
            }}
          />
          <Tab.Screen
            name="Stress"
            component={StressTest}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="warning-outline" size={size} color={color} />
              ),
              tabBarLabel: "Stress",
            }}
          />
          <Tab.Screen
            name="OnboardTest"
            component={OnboardingTest}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Ionicons
                  name="checkmark-circle-outline"
                  size={size}
                  color={color}
                />
              ),
              tabBarLabel: "Tests",
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
