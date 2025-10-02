import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import linking from "./linking";
import TabNavigator from "./TabNavigator";
import Splash from "../screens/Onboarding/Splash";
import OnboardingScreen from "../screens/Onboarding/OnboardingScreen";
import RoleSelection from "../screens/Auth/RoleSelection";
import SignUp from "../screens/Auth/SignUp";
import Login from "../screens/Auth/Login";
import VerifyCode from "../screens/Auth/VerifyCode";
import ForgotPassword from "../screens/Auth/ForgotPassword";
import ListingDetailsScreen from "../screens/Listing/ListingDetailsScreen";
import ApplyWizard from "../screens/Applications/ApplyWizard";
import ThreadScreen from "../screens/Messages/ThreadScreen";
import AvailabilityUpdater from "../screens/Provider/AvailabilityUpdater";
import { RootStackParamList } from "./types";

// Create a stack navigator - this manages screens that stack on top of each other
// Like when you go from a list to a detail screen
const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    // NavigationContainer is the top-level component that wraps all navigation
    <NavigationContainer linking={linking}>
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

        {/* Main App */}
        <Stack.Screen name="Tabs" component={TabNavigator} />

        {/* Listing Details */}
        <Stack.Screen name="ListingDetails" component={ListingDetailsScreen} />

        {/* Apply Wizard */}
        <Stack.Screen
          name="ApplyWizard"
          component={ApplyWizard}
          options={{
            presentation: "modal",
            animation: "slide_from_bottom",
          }}
        />

        {/* Thread Screen */}
        <Stack.Screen name="Thread" component={ThreadScreen} />

        {/* Provider Screens */}
        <Stack.Screen name="AvailabilityUpdater" component={AvailabilityUpdater} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
