import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";

export type RootStackParamList = {
  Splash: undefined;
  OnboardingScreen: undefined;
  RoleSelection: undefined;
  SignUp: undefined;
  Login: undefined;
  VerifyCode: { email?: string };
  ForgotPassword: undefined;
  ResetPassword: { email?: string };
  Tabs: undefined;
  ListingDetails: { listingId?: string };
  ApplyWizard: { listingId?: string };
  ApplicationsList: undefined;
  SavedSearchesScreen: undefined;
  Thread: {
    threadId?: string;
    messageId: string;
    applicationId: string;
    propertyTitle: string;
    senderName: string;
    participantId?: string;
  };
  DevMenu: undefined;
  ProviderDashboard: undefined;
  AddListing: undefined;
  AddressPicker: undefined;
  EditListing: {
    listingId: string;
    listingData?: {
      id: string;
      title: string;
      address: string;
      totalBeds: number;
      availableBeds: number;
      lastUpdated: string;
    };
  };
  AvailabilityUpdater: undefined;
  ListingWizard: undefined;
  GeoTest: undefined;
  ApplicationsInbox: undefined;
  ApplicationDetail: { applicationId: string };
  ProviderListingDetails: { listingId: string };
  SearchScreen: { savedFilters?: any };
  BlockedUsers: undefined;
  TermsOfService: undefined;
};

export type RootStackNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;
export type RootStackRouteProp<T extends keyof RootStackParamList> = RouteProp<
  RootStackParamList,
  T
>;
