/* eslint-env jest */
/**
 * Jest設定ファイル
 *
 * Task 12: Firebase依存の完全削除 - Supabase対応
 *
 * 各テストファイルの実行前にロードされるセットアップファイル
 * - Expo Routerのモック
 * - 共通モック設定
 */

// Mock expo-router
jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');

  // Tabs.Screen呼び出しを記録するためのモック関数
  const mockTabsScreen = jest.fn(({ name: _name, options: _options }) => null);

  // Tabsコンポーネント(子要素をそのままレンダリング)
  const MockTabs = ({ children, screenOptions: _screenOptions }) => {
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

// Mock @react-native-async-storage/async-storage
// @see https://react-native-async-storage.github.io/async-storage/docs/advanced/jest
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Suppress console warnings in tests (keep error for debugging)
global.console = {
  ...console,
  warn: jest.fn(),
  // error: jest.fn(), // errorはデバッグ用に残す
};
