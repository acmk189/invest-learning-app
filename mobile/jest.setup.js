/* eslint-env jest */
/**
 * Jest設定ファイル
 *
 * 各テストファイルの実行前にロードされるセットアップファイル
 * - React Native Firebaseのモック
 * - Expo Routerのモック
 * - 共通モック設定
 */

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
      get: jest.fn(() =>
        Promise.resolve({ exists: true, data: () => ({ test: true }) })
      ),
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

// Mock expo-router
jest.mock('expo-router', () => {
  const React = require('react');

  // Tabs.Screen呼び出しを記録するためのモック関数
  const mockTabsScreen = jest.fn(({ name, options }) => null);

  // Tabsコンポーネント（子要素をそのままレンダリング）
  const MockTabs = ({ children, screenOptions }) => {
    return React.createElement(React.Fragment, null, children);
  };

  // Tabs.ScreenをMockTabsのプロパティとして設定
  MockTabs.Screen = mockTabsScreen;

  // Stack.Screen呼び出しを記録するためのモック関数
  const mockStackScreen = jest.fn(() => null);

  // Stackコンポーネント
  const MockStack = ({ children }) => {
    return React.createElement(React.Fragment, null, children);
  };

  MockStack.Screen = mockStackScreen;

  return {
    __esModule: true,
    Tabs: MockTabs,
    Stack: MockStack,
    useRouter: jest.fn(() => ({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
    })),
    useSegments: jest.fn(() => []),
    usePathname: jest.fn(() => '/'),
  };
});

// Mock expo-status-bar
jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

// Suppress console warnings in tests (keep error for debugging)
global.console = {
  ...console,
  warn: jest.fn(),
  // error: jest.fn(), // errorはデバッグ用に残す
};
