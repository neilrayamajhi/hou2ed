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

// Provide a stub for Expo ImportMeta registry to appease expo winter checks
try {
  Object.defineProperty(global, '__ExpoImportMetaRegistry', {
    configurable: true,
    get: () => ({}),
  });
} catch {}

// Provide a basic structuredClone polyfill for tests (Expo winter uses it)
if (typeof global.structuredClone !== 'function') {
  // naive clone sufficient for tests
  // @ts-ignore
  global.structuredClone = (val) => JSON.parse(JSON.stringify(val));
}
