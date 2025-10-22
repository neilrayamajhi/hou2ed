import "@testing-library/jest-native/extend-expect";

// Mock react-native-reanimated
jest.mock("react-native-reanimated", () => {
  const Reanimated = require("react-native-reanimated/mock");

  // The mock for `call` immediately calls the callback which is incorrect
  // So we override it with a no-op
  Reanimated.default.call = () => {};

  return Reanimated;
});

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

// Mock Expo SecureStore
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
}));

// Mock expo-image-picker
jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
  MediaTypeOptions: { Images: 'Images' },
}));

// Mock expo-file-system and image-manipulator used by storage.service
jest.mock('expo-file-system', () => ({
  cacheDirectory: '/tmp/',
  getInfoAsync: jest.fn(async () => ({ exists: false })),
  makeDirectoryAsync: jest.fn(async () => {}),
  readAsStringAsync: jest.fn(async () => ''),
  writeAsStringAsync: jest.fn(async () => {}),
}), { virtual: true });
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: async (uri, actions, opts) => ({ uri }),
  SaveFormat: { JPEG: 'jpeg' },
}), { virtual: true });

// Mock react-native-safe-area-context
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }) => children,
  SafeAreaProvider: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// Mock NetInfo
jest.mock("@react-native-community/netinfo", () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
}));

// Mock react-navigation
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
  useFocusEffect: jest.fn(),
}));

// Mock Ionicons
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

// Mock react-native-maps
jest.mock("react-native-maps", () => ({
  __esModule: true,
  default: "MapView",
  Marker: "Marker",
  PROVIDER_GOOGLE: "google",
}));

// Mock react-native-snap-carousel
jest.mock("react-native-snap-carousel", () => ({
  __esModule: true,
  default: "Carousel",
}));

// Mock Linking API
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  getInitialURL: jest.fn(async () => null),
  openURL: jest.fn(async () => true),
}));

// Mock TurboModuleRegistry to avoid DevMenu errors in RN during tests
jest.mock('react-native/Libraries/TurboModule/TurboModuleRegistry', () => ({
  getEnforcing: () => ({}),
  get: () => ({}),
}));

// Mock RN Dimensions and NativeDeviceInfo used under the hood
jest.mock('react-native/src/private/specs_DEPRECATED/modules/NativeDeviceInfo', () => ({
  getConstants: () => ({
    Dimensions: {
      window: { width: 375, height: 667, scale: 2, fontScale: 2 },
      screen: { width: 375, height: 667, scale: 2, fontScale: 2 },
    },
  }),
}), { virtual: true });
jest.mock('react-native/Libraries/Utilities/Dimensions', () => ({
  get: () => ({ width: 375, height: 667, scale: 2, fontScale: 2 }),
}), { virtual: true });

// Mock RN StyleSheet to bypass feature flags
jest.mock('react-native/Libraries/StyleSheet/StyleSheet', () => ({
  create: (styles) => styles,
}), { virtual: true });

// Mock RN FeatureFlags modules
jest.mock('react-native/src/private/featureflags/specs/NativeReactNativeFeatureFlags', () => ({
  get: () => ({}),
  getConstants: () => ({}),
}), { virtual: true });
jest.mock('react-native/src/private/featureflags/ReactNativeFeatureFlagsBase', () => ({}), { virtual: true });
jest.mock('react-native/src/private/featureflags/ReactNativeFeatureFlags', () => ({}), { virtual: true });

// Mock DevMenu native spec to avoid lookups
jest.mock('react-native/src/private/devsupport/devmenu/specs/NativeDevMenu', () => ({
  getConstants: () => ({}),
}), { virtual: true });

// Suppress console warnings in tests
const originalWarn = console.warn;
beforeAll(() => {
  console.warn = (...args) => {
    if (
      args[0]?.includes?.("ViewPropTypes") ||
      args[0]?.includes?.("ColorPropType")
    ) {
      return;
    }
    originalWarn(...args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
});
