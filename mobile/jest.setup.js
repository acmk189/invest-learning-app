// Jest setup for React Native Firebase
// This file is loaded before each test file

// Mock @react-native-firebase/app
jest.mock('@react-native-firebase/app', () => {
  return {
    __esModule: true,
    default: jest.fn(),
  };
});

// Mock @react-native-firebase/firestore
jest.mock('@react-native-firebase/firestore', () => {
  const mockCollection = jest.fn(() => ({
    doc: jest.fn(() => ({
      set: jest.fn(() => Promise.resolve()),
      get: jest.fn(() => Promise.resolve({ exists: true, data: () => ({ test: true }) })),
      delete: jest.fn(() => Promise.resolve()),
    })),
  }));

  const mockFirestore = jest.fn(() => ({
    collection: mockCollection,
    settings: jest.fn(() => Promise.resolve()),
  }));

  mockFirestore.FieldValue = {
    serverTimestamp: jest.fn(() => new Date()),
  };

  return {
    __esModule: true,
    default: mockFirestore,
  };
});

// Suppress console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
