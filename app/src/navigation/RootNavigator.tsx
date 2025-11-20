import React, { useEffect, useRef } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Notifications from "expo-notifications";
import linking from "./linking";
import TabNavigator from "./TabNavigator";
import { useAuthStore } from "../state/useAuthStore";
import Splash from "../screens/Onboarding/Splash";
import OnboardingScreen from "../screens/Onboarding/OnboardingScreen";
import RoleSelection from "../screens/Auth/RoleSelection";
import SignUp from "../screens/Auth/SignUp";
import Login from "../screens/Auth/Login";
import VerifyCode from "../screens/Auth/VerifyCode";
import ForgotPassword from "../screens/Auth/ForgotPassword";
import ResetPassword from "../screens/Auth/ResetPassword";
import ListingDetailsScreen from "../screens/Listing/ListingDetailsScreen";
import ProviderListingDetails from "../screens/Provider/ListingDetails";
import ApplyWizard from "../screens/Applications/ApplyWizard";
import ApplicationsListScreen from "../screens/Applications/ApplicationsListScreen";
import SavedSearchesScreen from "../screens/Saved/SavedSearchesScreen";
import ThreadScreen from "../screens/Messages/ThreadScreen";
import DevMenu from "../screens/Dev/DevMenu";
import ProviderDashboard from "../screens/Provider/ProviderDashboard";
import AddListing from "../screens/Provider/AddListing";
import EditListing from "../screens/Provider/EditListing";
import AvailabilityUpdater from "../screens/Provider/AvailabilityUpdater";
import ListingWizard from "../screens/Provider/ListingWizard";
import GeoTest from "../screens/Provider/GeoTest";
import AddressPicker from "../screens/Provider/AddressPicker";
import ApplicationsInbox from "../screens/Provider/ApplicationsInbox";
import ApplicationDetail from "../screens/Provider/ApplicationDetail";
import { RootStackParamList } from "./types";

// Create a stack navigator - this manages screens that stack on top of each other
// Like when you go from a list to a detail screen
const Stack = createNativeStackNavigator<RootStackParamList>();

// Wrapper component that remounts TabNavigator when user role changes
function TabNavigatorWrapper() {
  const user = useAuthStore((state) => state.user);

  // Use a simple key based on user ID and role - no complex state needed!
  // Every time user changes, this creates a new key, forcing TabNavigator to remount
  const key = `tabs-${user?.role || "none"}-${user?.id || "none"}`;

  console.log("🔧 [TabNavigatorWrapper] ========== CALLED ==========");
  console.log("   User from store:", user?.email || "NO USER IN STORE");
  console.log("   User ID:", user?.id || "NO ID");
  console.log("   Role:", user?.role || "NO ROLE");
  console.log("   Key:", key);
  console.log("🔧 [TabNavigatorWrapper] ===================================");

  useEffect(() => {
    console.log("🔧 [TabNavigatorWrapper] Mounted with role:", user?.role);
    return () => {
      console.log("🔧 [TabNavigatorWrapper] Unmounting");
    };
  }, [user?.role]);

  // If no user, don't render tabs
  if (!user) {
    console.log(
      "🔧 [TabNavigatorWrapper] No user - not rendering TabNavigator",
    );
    return null;
  }

  // Key forces complete remount when role or user ID changes
  return <TabNavigator key={key} />;
}

export default function RootNavigator() {
  const navigationRef = useRef<any>(null);
  const hasHandledInitialNotification = useRef(false);

  // Handle notification taps for providers
  useEffect(() => {
    console.log("[RootNavigator] Setting up notification listener");

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log("[RootNavigator] 📬 Notification response received");
        console.log(
          "  Has handled initial?",
          hasHandledInitialNotification.current,
        );
        console.log(
          "  Notification data:",
          response.notification.request.content.data,
        );

        // Ignore the first notification response on app launch (prevents auto-navigation from old notifications)
        if (!hasHandledInitialNotification.current) {
          console.log(
            "📱 [RootNavigator] ✋ IGNORING initial notification (app just launched)",
          );
          hasHandledInitialNotification.current = true;
          return;
        }

        const data = response.notification.request.content.data;
        console.log("📬 [RootNavigator] Processing notification:", data);

        // Only handle our specific notification types
        if (!data || !data.type) {
          console.log("⚠️ Ignoring notification with no type");
          return;
        }

        // If it's a provider availability reminder, navigate to AvailabilityUpdater
        if (
          data.type === "daily_availability_reminder" &&
          data.userRole === "provider"
        ) {
          console.log(
            "📱 Provider tapped availability reminder - navigating to updater",
          );

          // Navigate to Tabs first, then to Dashboard/AvailabilityUpdater
          if (navigationRef.current) {
            navigationRef.current.navigate("Tabs", { screen: "Dashboard" });
            // Small delay to ensure tab is loaded
            setTimeout(() => {
              navigationRef.current.navigate("AvailabilityUpdater");
            }, 100);
          }
        }

        // If it's a seeker application check, navigate to ApplicationsList
        if (
          data.type === "daily_application_check" &&
          data.userRole === "seeker"
        ) {
          console.log(
            "📱 Seeker tapped application notification - navigating to list",
          );
          if (navigationRef.current) {
            navigationRef.current.navigate("ApplicationsList");
          }
        }
      },
    );

    return () => {
      console.log("[RootNavigator] Cleaning up notification listener");
      subscription.remove();
    };
  }, []);

  const onNavigationReady = () => {
    console.log("[RootNavigator] Navigation ready");
  };

  const onNavigationStateChange = (state: any) => {
    console.log("[RootNavigator] Navigation state changed:", state);
    if (state) {
      const currentRoute = state.routes[state.index];
      console.log("   Current route:", currentRoute?.name);
      console.log("   Route params:", currentRoute?.params);
    }
  };

  return (
    // NavigationContainer is the top-level component that wraps all navigation
    <NavigationContainer
      linking={linking}
      ref={navigationRef}
      onReady={onNavigationReady}
      onStateChange={onNavigationStateChange}
    >
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          // Hide the default header - we'll create custom headers
          headerShown: false,
          // Smooth transitions between screens with fade and slide
          animation: "fade_from_bottom",
          animationDuration: 400,
        }}
      >
        {/* Onboarding Flow */}
        <Stack.Screen name="Splash" component={Splash} />
        <Stack.Screen name="OnboardingScreen" component={OnboardingScreen} />

        {/* Auth Flow */}
        <Stack.Screen name="RoleSelection" component={RoleSelection} />
        <Stack.Screen name="SignUp" component={SignUp} />
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="VerifyCode" component={VerifyCode} />
        <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
        <Stack.Screen name="ResetPassword" component={ResetPassword} />

        {/* Main App */}
        <Stack.Screen name="Tabs" component={TabNavigatorWrapper} />

        {/* Listing Details (seeker) */}
        <Stack.Screen name="ListingDetails" component={ListingDetailsScreen} />
        {/* Provider Listing Details */}
        <Stack.Screen
          name="ProviderListingDetails"
          component={ProviderListingDetails}
        />

        {/* Apply Wizard */}
        <Stack.Screen
          name="ApplyWizard"
          component={ApplyWizard}
          options={{
            presentation: "modal",
            animation: "slide_from_bottom",
          }}
        />

        {/* Applications List */}
        <Stack.Screen
          name="ApplicationsList"
          component={ApplicationsListScreen}
        />

        {/* Saved Searches */}
        <Stack.Screen
          name="SavedSearchesScreen"
          component={SavedSearchesScreen}
        />

        {/* Thread Screen */}
        <Stack.Screen name="Thread" component={ThreadScreen} />

        {/* Dev Menu */}
        <Stack.Screen name="DevMenu" component={DevMenu} />

        {/* Provider Screens - Now nested in DashboardStack to keep tab bar visible */}
        {/* Keeping ProviderDashboard here for backwards compatibility with deep links */}
        <Stack.Screen name="ProviderDashboard" component={ProviderDashboard} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
