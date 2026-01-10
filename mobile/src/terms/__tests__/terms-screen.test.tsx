/**
 * Terms Screen テスト
 * Task 23.1, 23.2, 23.3, 23.4: 用語画面のUIコンポーネントテスト
 *
 * @see Requirements: 5.1, 5.2, 7.5, 6.3
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TermsScreen } from '../terms-screen';
import { TermsViewModelResult } from '../terms-viewmodel';
import { ThemeProvider } from '../../theme';

// テスト用のモックデータ
const mockTerms = [
  {
    name: 'PER（株価収益率）',
    description:
      'PERとは、Price Earnings Ratioの略で、日本語では「株価収益率」と呼ばれます。株価が1株当たりの純利益の何倍になっているかを示す指標です。'.repeat(
        5
      ), // 約500文字相当
    difficulty: 'beginner' as const,
  },
  {
    name: 'ROE（自己資本利益率）',
    description:
      'ROEとは、Return On Equityの略で、日本語では「自己資本利益率」と呼ばれます。企業が自己資本を使ってどれだけ効率的に利益を上げているかを示す指標です。'.repeat(
        5
      ), // 約500文字相当
    difficulty: 'intermediate' as const,
  },
  {
    name: 'デリバティブ',
    description:
      'デリバティブとは、株式や債券、金利、為替などの原資産から派生した金融商品の総称です。先物取引やオプション取引などが代表的な例です。'.repeat(
        6
      ), // 約500文字相当
    difficulty: 'advanced' as const,
  },
];

// ViewModelのモック結果を生成するヘルパー関数
const createMockViewModelResult = (
  overrides: Partial<TermsViewModelResult> = {}
): TermsViewModelResult => ({
  state: 'success',
  loading: false,
  terms: mockTerms,
  error: null,
  retry: jest.fn(),
  ...overrides,
});

// ThemeProviderでラップしてレンダリングするヘルパー
const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider>{component}</ThemeProvider>);
};

describe('TermsScreen', () => {
  describe('タスク23.1: 用語画面基本レイアウト', () => {
    it('3つの用語カードをリスト形式で表示する', () => {
      const viewModelResult = createMockViewModelResult();
      const { getByTestId } = renderWithTheme(
        <TermsScreen viewModelResult={viewModelResult} />
      );

      // 3つの用語カードが存在することを確認
      expect(getByTestId('term-card-0')).toBeTruthy();
      expect(getByTestId('term-card-1')).toBeTruthy();
      expect(getByTestId('term-card-2')).toBeTruthy();
    });

    it('用語カードがスクロール可能なコンテナ内に表示される', () => {
      const viewModelResult = createMockViewModelResult();
      const { getByTestId } = renderWithTheme(
        <TermsScreen viewModelResult={viewModelResult} />
      );

      // スクロール可能なコンテナが存在することを確認
      expect(getByTestId('terms-scroll-view')).toBeTruthy();
    });

    it('用語がない場合でもレイアウトがクラッシュしない', () => {
      const viewModelResult = createMockViewModelResult({
        terms: null,
      });

      expect(() =>
        renderWithTheme(<TermsScreen viewModelResult={viewModelResult} />)
      ).not.toThrow();
    });

    it('空の用語配列でもレイアウトがクラッシュしない', () => {
      const viewModelResult = createMockViewModelResult({
        terms: [],
      });

      expect(() =>
        renderWithTheme(<TermsScreen viewModelResult={viewModelResult} />)
      ).not.toThrow();
    });
  });

  describe('タスク23.2: 用語カードコンポーネント', () => {
    it('各カードに用語名を表示する', () => {
      const viewModelResult = createMockViewModelResult();
      const { getByText } = renderWithTheme(
        <TermsScreen viewModelResult={viewModelResult} />
      );

      expect(getByText(mockTerms[0].name)).toBeTruthy();
      expect(getByText(mockTerms[1].name)).toBeTruthy();
      expect(getByText(mockTerms[2].name)).toBeTruthy();
    });

    it('各カードに解説文を表示する', () => {
      const viewModelResult = createMockViewModelResult();
      const { getByText } = renderWithTheme(
        <TermsScreen viewModelResult={viewModelResult} />
      );

      // 解説文が表示されていることを確認
      expect(getByText(mockTerms[0].description)).toBeTruthy();
      expect(getByText(mockTerms[1].description)).toBeTruthy();
      expect(getByText(mockTerms[2].description)).toBeTruthy();
    });

    it('用語名が太字で強調表示される', () => {
      const viewModelResult = createMockViewModelResult();
      const { getByTestId } = renderWithTheme(
        <TermsScreen viewModelResult={viewModelResult} />
      );

      // 用語名のスタイルにfontWeight: '700'が含まれることを確認
      const termName = getByTestId('term-name-0');
      const styleArray = Array.isArray(termName.props.style)
        ? termName.props.style
        : [termName.props.style];
      const hasBoldWeight = styleArray.some(
        (style: Record<string, unknown>) =>
          style && (style.fontWeight === '700' || style.fontWeight === 'bold')
      );
      expect(hasBoldWeight).toBe(true);
    });

    it('各カードに難易度バッジを表示する', () => {
      const viewModelResult = createMockViewModelResult();
      const { getByTestId } = renderWithTheme(
        <TermsScreen viewModelResult={viewModelResult} />
      );

      // 難易度バッジが存在することを確認
      expect(getByTestId('difficulty-badge-0')).toBeTruthy();
      expect(getByTestId('difficulty-badge-1')).toBeTruthy();
      expect(getByTestId('difficulty-badge-2')).toBeTruthy();
    });
  });

  describe('タスク23.3: Termsローディング・エラー表示', () => {
    it('ローディング中はスピナーを表示する', () => {
      const viewModelResult = createMockViewModelResult({
        state: 'loading',
        loading: true,
        terms: null,
      });
      const { getByTestId } = renderWithTheme(
        <TermsScreen viewModelResult={viewModelResult} />
      );

      expect(getByTestId('loading-indicator')).toBeTruthy();
    });

    it('ローディング中は用語カードを表示しない', () => {
      const viewModelResult = createMockViewModelResult({
        state: 'loading',
        loading: true,
        terms: null,
      });
      const { queryByTestId } = renderWithTheme(
        <TermsScreen viewModelResult={viewModelResult} />
      );

      expect(queryByTestId('term-card-0')).toBeNull();
    });

    it('エラー時はエラーメッセージを表示する', () => {
      const viewModelResult = createMockViewModelResult({
        state: 'error',
        loading: false,
        terms: null,
        error: {
          code: 'CONNECTION_FAILED',
          message: 'ネットワークに接続できませんでした',
          retryable: true,
        },
      });
      const { getByText } = renderWithTheme(
        <TermsScreen viewModelResult={viewModelResult} />
      );

      expect(getByText('ネットワークに接続できませんでした')).toBeTruthy();
    });

    it('リトライ可能なエラー時はリトライボタンを表示する', () => {
      const mockRetry = jest.fn();
      const viewModelResult = createMockViewModelResult({
        state: 'error',
        loading: false,
        terms: null,
        error: {
          code: 'CONNECTION_FAILED',
          message: 'ネットワークに接続できませんでした',
          retryable: true,
        },
        retry: mockRetry,
      });
      const { getByText } = renderWithTheme(
        <TermsScreen viewModelResult={viewModelResult} />
      );

      const retryButton = getByText('再試行');
      expect(retryButton).toBeTruthy();

      // リトライボタンをタップ
      fireEvent.press(retryButton);
      expect(mockRetry).toHaveBeenCalledTimes(1);
    });

    it('リトライ不可能なエラー時はリトライボタンを表示しない', () => {
      const viewModelResult = createMockViewModelResult({
        state: 'error',
        loading: false,
        terms: null,
        error: {
          code: 'UNKNOWN',
          message: '不明なエラーが発生しました',
          retryable: false,
        },
      });
      const { queryByText } = renderWithTheme(
        <TermsScreen viewModelResult={viewModelResult} />
      );

      expect(queryByText('再試行')).toBeNull();
    });
  });

  describe('タスク23.4: Terms iOSサイズ対応', () => {
    it('コンテンツがスクロール可能である', () => {
      const viewModelResult = createMockViewModelResult();
      const { getByTestId } = renderWithTheme(
        <TermsScreen viewModelResult={viewModelResult} />
      );

      const scrollView = getByTestId('terms-scroll-view');
      // ScrollView が存在することを確認
      expect(scrollView.type).toBe('RCTScrollView');
    });

    it('レイアウトがflex: 1でコンテナいっぱいに広がる', () => {
      const viewModelResult = createMockViewModelResult();
      const { getByTestId } = renderWithTheme(
        <TermsScreen viewModelResult={viewModelResult} />
      );

      const container = getByTestId('terms-container');
      // スタイルが配列の場合、配列内のいずれかのオブジェクトにflex: 1が含まれることを確認
      const styleArray = Array.isArray(container.props.style)
        ? container.props.style
        : [container.props.style];
      const hasFlex = styleArray.some(
        (style: Record<string, unknown>) => style && style.flex === 1
      );
      expect(hasFlex).toBe(true);
    });
  });

  describe('アクセシビリティ', () => {
    it('用語カードにアクセシビリティラベルが設定されている', () => {
      const viewModelResult = createMockViewModelResult();
      const { getByTestId } = renderWithTheme(
        <TermsScreen viewModelResult={viewModelResult} />
      );

      const card = getByTestId('term-card-0');
      expect(card.props.accessible).toBe(true);
      expect(card.props.accessibilityLabel).toContain(mockTerms[0].name);
    });

    it('リトライボタンにアクセシビリティ属性が設定されている', () => {
      const viewModelResult = createMockViewModelResult({
        state: 'error',
        loading: false,
        terms: null,
        error: {
          code: 'CONNECTION_FAILED',
          message: 'エラーが発生しました',
          retryable: true,
        },
      });
      const { getByLabelText } = renderWithTheme(
        <TermsScreen viewModelResult={viewModelResult} />
      );

      // accessibilityLabelで取得し、accessibilityRoleを確認
      const retryButton = getByLabelText('再試行ボタン');
      expect(retryButton.props.accessibilityRole).toBe('button');
    });
  });
});
