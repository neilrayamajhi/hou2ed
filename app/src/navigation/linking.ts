import { LinkingOptions } from "@react-navigation/native";

const linking: LinkingOptions<any> = {
  prefixes: ["hou2ed://", "https://hou2ed.com", "http://localhost:3000"],
  config: {
    screens: {
      Splash: "",
      OnboardingScreen: "onboarding",
      RoleSelection: "role",
      SignUp: "signup",
      Login: "login",
      VerifyCode: "verify",
      ForgotPassword: "forgot-password",
      Tabs: {
        screens: {
          Home: "home",
          Search: "search",
          Messages: "messages",
          Saved: "saved",
          Profile: "profile",
        },
      },
      ListingDetails: "listing/:listingId",
      ApplyWizard: "apply/:listingId",
      Thread: "thread/:messageId",
      AvailabilityUpdater: "provider/update",
    },
  },
};

export default linking;