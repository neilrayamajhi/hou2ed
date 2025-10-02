// Disable Expo winter module
global.__expo = {
  registerComponent: () => {},
};

// Mock TextDecoderStream and other Web APIs
global.TextDecoderStream = class TextDecoderStream {};
global.TextEncoderStream = class TextEncoderStream {};

// Prevent Expo from trying to load winter module
jest.mock("expo/src/winter/runtime.native", () => ({}), { virtual: true });
jest.mock("expo/src/winter/installGlobal", () => ({}), { virtual: true });