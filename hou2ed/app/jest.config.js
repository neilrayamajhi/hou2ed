module.exports = {
  preset: "jest-expo",
  testEnvironment: "node",
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-maps|react-native-snap-carousel|@react-native-community/netinfo|react-native-modal|zustand|@tanstack/.*)",
  ],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  setupFiles: ["<rootDir>/jest.setup.expo.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.spec.{ts,tsx}",
    "!src/**/*.test.{ts,tsx}",
  ],
  globals: {
    __DEV__: true
  }
};