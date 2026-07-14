import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AdminDashboard from "../screens/Admin/AdminDashboard";
import UserManagementList from "../screens/Admin/UserManagementList";
import UserDetail from "../screens/Admin/UserDetail";
import ListingModerationList from "../screens/Admin/ListingModerationList";
import ListingModerationDetail from "../screens/Admin/ListingModerationDetail";
import ReportsList from "../screens/Admin/ReportsList";
import ReportDetail from "../screens/Admin/ReportDetail";

export type AdminStackParamList = {
  AdminDashboardHome: undefined;
  UserManagementList: undefined;
  UserDetail: { userId: string };
  ListingModerationList: undefined;
  ListingModerationDetail: { listingId: string };
  ReportsList: undefined;
  ReportDetail: { reportId: string };
};

const Stack = createNativeStackNavigator<AdminStackParamList>();

/**
 * AdminStack - Nested navigator for the Admin dashboard and related screens.
 * Mirrors DashboardStack so admin sub-screens can be navigated while keeping
 * the bottom tab bar visible.
 */
export default function AdminStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="AdminDashboardHome" component={AdminDashboard} />
      <Stack.Screen name="UserManagementList" component={UserManagementList} />
      <Stack.Screen name="UserDetail" component={UserDetail} />
      <Stack.Screen
        name="ListingModerationList"
        component={ListingModerationList}
      />
      <Stack.Screen
        name="ListingModerationDetail"
        component={ListingModerationDetail}
      />
      <Stack.Screen name="ReportsList" component={ReportsList} />
      <Stack.Screen name="ReportDetail" component={ReportDetail} />
    </Stack.Navigator>
  );
}
