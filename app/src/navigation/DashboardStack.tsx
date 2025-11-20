import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ProviderDashboard from "../screens/Provider/ProviderDashboard";
import ProviderListingDetails from "../screens/Provider/ListingDetails";
import AddListing from "../screens/Provider/AddListing";
import EditListing from "../screens/Provider/EditListing";
import AvailabilityUpdater from "../screens/Provider/AvailabilityUpdater";
import ListingWizard from "../screens/Provider/ListingWizard";
import GeoTest from "../screens/Provider/GeoTest";
import AddressPicker from "../screens/Provider/AddressPicker";
import ApplicationsInbox from "../screens/Provider/ApplicationsInbox";
import ApplicationDetail from "../screens/Provider/ApplicationDetail";

export type DashboardStackParamList = {
  DashboardHome: undefined;
  ProviderListingDetails: { listingId: string };
  AddListing: undefined;
  EditListing: { listingId: string };
  AvailabilityUpdater: undefined;
  ListingWizard: { listingId?: string };
  GeoTest: undefined;
  AddressPicker: undefined;
  ApplicationsInbox: undefined;
  ApplicationDetail: { applicationId: string };
};

const Stack = createNativeStackNavigator<DashboardStackParamList>();

/**
 * DashboardStack - Nested navigator for Provider Dashboard and related screens
 * This allows provider screens to be navigated while keeping the bottom tab bar visible
 */
export default function DashboardStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // Hide default headers - screens have custom headers
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="DashboardHome" component={ProviderDashboard} />
      <Stack.Screen
        name="ProviderListingDetails"
        component={ProviderListingDetails}
      />
      <Stack.Screen name="AddListing" component={AddListing} />
      <Stack.Screen name="EditListing" component={EditListing} />
      <Stack.Screen
        name="AvailabilityUpdater"
        component={AvailabilityUpdater}
      />
      <Stack.Screen name="ListingWizard" component={ListingWizard} />
      <Stack.Screen name="GeoTest" component={GeoTest} />
      <Stack.Screen name="AddressPicker" component={AddressPicker} />
      <Stack.Screen name="ApplicationsInbox" component={ApplicationsInbox} />
      <Stack.Screen name="ApplicationDetail" component={ApplicationDetail} />
    </Stack.Navigator>
  );
}
