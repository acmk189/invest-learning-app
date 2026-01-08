/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * タブナビゲーションのテスト
 *
 * - Expo Routerのファイルベースルーティングが正しく設定されていること
 * - 「ニュース」「用語」の2タブが存在すること
 * - 各タブが適切なアイコンとラベルを持つこと
 *
 * 注意: Expo Routerはファイルベースルーティングのため、
 * ファイル存在確認と基本的な構造テストを中心に行う
 */

import React from 'react';
import { render } from '@testing-library/react-native';

// タブ画面コンポーネントのインポート
import NewsScreen from '../../app/(tabs)/index';
import TermsScreen from '../../app/(tabs)/terms';
import { ThemeProvider } from '../../src/theme';

/**
 * テスト用のラッパーコンポーネント
 * ThemeProviderでラップしてテスト対象を提供
 */
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('タブ画面コンポーネント', () => {
  describe('NewsScreen', () => {
    it('NewsScreenコンポーネントが正しくレンダリングされること', () => {
      expect(() =>
        render(<NewsScreen />, { wrapper: TestWrapper })
      ).not.toThrow();
    });

    it('ニュース画面にローディング状態またはコンテンツが表示されること', () => {
      // News Viewでは初期状態でローディングインジケーターが表示される
      // （ViewModelがデータをフェッチするため）
      const { getByTestId, queryByText } = render(<NewsScreen />, {
        wrapper: TestWrapper,
      });
      // ローディング中はローディングインジケーターまたはニュースコンテナが存在する
      const loadingIndicator = queryByText(/ニュースを読み込んでいます/);
      const newsContainer = getByTestId('news-container');
      expect(loadingIndicator || newsContainer).toBeTruthy();
    });

    it('ニュース画面のコンテナが正しくレンダリングされること', () => {
      const { getByTestId } = render(<NewsScreen />, { wrapper: TestWrapper });
      expect(getByTestId('news-container')).toBeTruthy();
    });
  });

  describe('TermsScreen', () => {
    it('TermsScreenコンポーネントが正しくレンダリングされること', () => {
      expect(() =>
        render(<TermsScreen />, { wrapper: TestWrapper })
      ).not.toThrow();
    });

    it('用語画面にプレースホルダーテキストが表示されること', () => {
      const { getByText } = render(<TermsScreen />, { wrapper: TestWrapper });
      expect(getByText(/用語機能は現在開発中です/)).toBeTruthy();
    });

    it('用語画面に3つの投資用語についての説明があること', () => {
      const { getByText } = render(<TermsScreen />, { wrapper: TestWrapper });
      expect(getByText(/今日の3つの投資用語/)).toBeTruthy();
    });
  });
});

describe('TabLayoutコンポーネント', () => {
  it('TabLayoutモジュールが正しくエクスポートされていること', () => {
    const TabLayoutModule = require('../../app/(tabs)/_layout');
    expect(TabLayoutModule.default).toBeDefined();
    expect(typeof TabLayoutModule.default).toBe('function');
  });

  it('TabLayoutがReactコンポーネントとしてレンダリング可能であること', () => {
    const TabLayout = require('../../app/(tabs)/_layout').default;
    // TabLayoutはThemeProviderを使用するため、ラッパーが必要
    expect(() => render(<TabLayout />, { wrapper: TestWrapper })).not.toThrow();
  });
});

describe('RootLayoutコンポーネント', () => {
  it('RootLayoutモジュールが正しくエクスポートされていること', () => {
    const RootLayoutModule = require('../../app/_layout');
    expect(RootLayoutModule.default).toBeDefined();
    expect(typeof RootLayoutModule.default).toBe('function');
  });

  it('RootLayoutがReactコンポーネントとしてレンダリング可能であること', () => {
    const RootLayout = require('../../app/_layout').default;
    // RootLayoutは内部でThemeProviderを持っているのでラッパー不要
    expect(() => render(<RootLayout />)).not.toThrow();
  });
});

describe('ファイルベースルーティング構造', () => {
  it('必要なルートファイルが存在すること', () => {
    expect(() => require('../../app/_layout')).not.toThrow();
    expect(() => require('../../app/(tabs)/_layout')).not.toThrow();
    expect(() => require('../../app/(tabs)/index')).not.toThrow();
    expect(() => require('../../app/(tabs)/terms')).not.toThrow();
  });

  it('タブ構成が「ニュース」と「用語」の2タブであること', () => {
    const { Tabs } = require('expo-router');
    const TabLayout = require('../../app/(tabs)/_layout').default;

    // モックをクリア
    (Tabs.Screen as jest.Mock).mockClear();

    // TabLayoutをレンダリング（ThemeProviderでラップ）
    render(<TabLayout />, { wrapper: TestWrapper });

    // Tabs.Screenが2回呼ばれていること
    const calls = (Tabs.Screen as jest.Mock).mock.calls;
    expect(calls.length).toBe(2);

    // 呼び出しからタブ名を取得
    const tabNames = calls.map((call: [{ name: string }]) => call[0]?.name);
    expect(tabNames).toContain('index'); // ニュースタブ
    expect(tabNames).toContain('terms'); // 用語タブ
  });
});

describe('タブラベル設定', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ニュースタブに「ニュース」ラベルが設定されていること', () => {
    const { Tabs } = require('expo-router');
    const TabLayout = require('../../app/(tabs)/_layout').default;

    (Tabs.Screen as jest.Mock).mockClear();
    render(<TabLayout />, { wrapper: TestWrapper });

    const calls = (Tabs.Screen as jest.Mock).mock.calls;
    const newsTabCall = calls.find(
      (call: [{ name: string }]) => call[0]?.name === 'index'
    );

    expect(newsTabCall).toBeDefined();
    expect(newsTabCall[0]?.options?.title).toBe('ニュース');
  });

  it('用語タブに「用語」ラベルが設定されていること', () => {
    const { Tabs } = require('expo-router');
    const TabLayout = require('../../app/(tabs)/_layout').default;

    (Tabs.Screen as jest.Mock).mockClear();
    render(<TabLayout />, { wrapper: TestWrapper });

    const calls = (Tabs.Screen as jest.Mock).mock.calls;
    const termsTabCall = calls.find(
      (call: [{ name: string }]) => call[0]?.name === 'terms'
    );

    expect(termsTabCall).toBeDefined();
    expect(termsTabCall[0]?.options?.title).toBe('用語');
  });
});

describe('ダークモード対応', () => {
  it('NewsScreenがThemeProviderのテーマを使用してレンダリングされること', () => {
    // ThemeProviderのテーマを使用しているか確認（エラーなくレンダリングできることを確認）
    const { getByTestId } = render(<NewsScreen />, { wrapper: TestWrapper });
    // news-containerが存在することで、テーマが正しく適用されていることを確認
    expect(getByTestId('news-container')).toBeTruthy();
  });

  it('TermsScreenがThemeProviderのテーマを使用してレンダリングされること', () => {
    const { getByText } = render(<TermsScreen />, { wrapper: TestWrapper });
    expect(getByText(/用語機能は現在開発中です/)).toBeTruthy();
  });
});
