/**
 * Terms UI最適化 テスト
 * Task 24.1, 24.2, 24.3: Terms UI最適化のテスト
 *
 * @see Requirements: 6.4, 6.5
 */

import React from 'react';
import { render } from '@testing-library/react-native';
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
      ),
    difficulty: 'beginner' as const,
  },
  {
    name: 'ROE（自己資本利益率）',
    description:
      'ROEとは、Return On Equityの略で、日本語では「自己資本利益率」と呼ばれます。企業が自己資本を使ってどれだけ効率的に利益を上げているかを示す指標です。'.repeat(
        5
      ),
    difficulty: 'intermediate' as const,
  },
  {
    name: 'デリバティブ',
    description:
      'デリバティブとは、株式や債券、金利、為替などの原資産から派生した金融商品の総称です。先物取引やオプション取引などが代表的な例です。'.repeat(
        6
      ),
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

describe('Terms UI最適化テスト', () => {
  describe('タスク24.1: Termsフォント・行間設定', () => {
    it('解説文のフォントサイズが16pt以上である', () => {
      const viewModelResult = createMockViewModelResult();
      const { getByText } = renderWithTheme(
        <TermsScreen viewModelResult={viewModelResult} />
      );

      // 解説文のテキスト要素を取得
      const descriptionText = getByText(mockTerms[0].description);
      const styles = descriptionText.props.style;

      // スタイルが配列の場合と単一の場合両方に対応
      const flattenedStyles = Array.isArray(styles)
        ? styles.reduce(
            (
              acc: Record<string, unknown>,
              style: Record<string, unknown>
            ) => ({ ...acc, ...style }),
            {}
          )
        : styles;

      // フォントサイズが16以上であることを確認
      expect(flattenedStyles.fontSize).toBeGreaterThanOrEqual(16);
    });

    it('解説文の行間が1.5倍以上である', () => {
      const viewModelResult = createMockViewModelResult();
      const { getByText } = renderWithTheme(
        <TermsScreen viewModelResult={viewModelResult} />
      );

      // 解説文のテキスト要素を取得
      const descriptionText = getByText(mockTerms[0].description);
      const styles = descriptionText.props.style;

      // スタイルが配列の場合と単一の場合両方に対応
      const flattenedStyles = Array.isArray(styles)
        ? styles.reduce(
            (
              acc: Record<string, unknown>,
              style: Record<string, unknown>
            ) => ({ ...acc, ...style }),
            {}
          )
        : styles;

      const fontSize = flattenedStyles.fontSize as number;
      const lineHeight = flattenedStyles.lineHeight as number;

      // 行間がフォントサイズの1.5倍以上であることを確認
      expect(lineHeight / fontSize).toBeGreaterThanOrEqual(1.5);
    });

    it('用語名のフォントサイズが解説文より大きい', () => {
      const viewModelResult = createMockViewModelResult();
      const { getByText, getByTestId } = renderWithTheme(
        <TermsScreen viewModelResult={viewModelResult} />
      );

      // 用語名と解説文のテキスト要素を取得
      const termNameElement = getByTestId('term-name-0');
      const descriptionText = getByText(mockTerms[0].description);

      const getStyles = (element: ReturnType<typeof getByText>) => {
        const styles = element.props.style;
        return Array.isArray(styles)
          ? styles.reduce(
              (
                acc: Record<string, unknown>,
                style: Record<string, unknown>
              ) => ({ ...acc, ...style }),
              {}
            )
          : styles;
      };

      const termNameStyles = getStyles(termNameElement);
      const descriptionStyles = getStyles(descriptionText);

      // 用語名のフォントサイズが解説文より大きいことを確認
      expect(termNameStyles.fontSize).toBeGreaterThan(
        descriptionStyles.fontSize
      );
    });
  });

  describe('タスク24.2: Termsカード余白・用語名強調', () => {
    it('カード間に適切な余白（16pt以上）がある', () => {
      const viewModelResult = createMockViewModelResult();
      const { getByTestId } = renderWithTheme(
        <TermsScreen viewModelResult={viewModelResult} />
      );

      const scrollView = getByTestId('terms-scroll-view');
      const contentContainerStyle = scrollView.props.contentContainerStyle;

      // contentContainerStyle の gap または padding を確認
      // gap が 16 以上、または padding が 16 以上であることを確認
      const hasAdequateSpacing =
        (contentContainerStyle.gap && contentContainerStyle.gap >= 16) ||
        (contentContainerStyle.padding && contentContainerStyle.padding >= 16);

      expect(hasAdequateSpacing).toBe(true);
    });

    it('カード内のパディングが適切（16pt以上）である', () => {
      const viewModelResult = createMockViewModelResult();
      const { getByTestId } = renderWithTheme(
        <TermsScreen viewModelResult={viewModelResult} />
      );

      // カードをtestIDで取得
      const card = getByTestId('term-card-0');

      if (card && card.props.style) {
        const styles = Array.isArray(card.props.style)
          ? card.props.style.reduce(
              (
                acc: Record<string, unknown>,
                style: Record<string, unknown>
              ) => ({ ...acc, ...style }),
              {}
            )
          : card.props.style;

        // パディングが16以上であることを確認
        expect(styles.padding).toBeGreaterThanOrEqual(16);
      }
    });

    it('用語名が太字で強調表示されている', () => {
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
          style &&
          (style.fontWeight === '700' || style.fontWeight === 'bold')
      );
      expect(hasBoldWeight).toBe(true);
    });

    it('用語名と解説文が視覚的に区別されている', () => {
      const viewModelResult = createMockViewModelResult();
      const { getByTestId, getByText } = renderWithTheme(
        <TermsScreen viewModelResult={viewModelResult} />
      );

      // 用語名と解説文のスタイルを取得
      const termNameElement = getByTestId('term-name-0');
      const descriptionElement = getByText(mockTerms[0].description);

      const getStyles = (element: ReturnType<typeof getByText>) => {
        const styles = element.props.style;
        return Array.isArray(styles)
          ? styles.reduce(
              (
                acc: Record<string, unknown>,
                style: Record<string, unknown>
              ) => ({ ...acc, ...style }),
              {}
            )
          : styles;
      };

      const termNameStyles = getStyles(termNameElement);
      const descriptionStyles = getStyles(descriptionElement);

      // フォントサイズまたはフォントウェイトが異なることを確認
      const isDifferent =
        termNameStyles.fontSize !== descriptionStyles.fontSize ||
        termNameStyles.fontWeight !== descriptionStyles.fontWeight;

      expect(isDifferent).toBe(true);
    });
  });

  describe('タスク24.3: Termsダークモード・アクセシビリティ', () => {
    it('用語カードにアクセシビリティラベルが設定されている', () => {
      const viewModelResult = createMockViewModelResult();
      const { getByTestId } = renderWithTheme(
        <TermsScreen viewModelResult={viewModelResult} />
      );

      // 用語カードにアクセシビリティラベルが設定されていることを確認
      const card = getByTestId('term-card-0');
      expect(card.props.accessible).toBe(true);
      expect(card.props.accessibilityLabel).toContain(mockTerms[0].name);
    });

    it('難易度バッジがアクセシビリティラベルに含まれている', () => {
      const viewModelResult = createMockViewModelResult();
      const { getByTestId } = renderWithTheme(
        <TermsScreen viewModelResult={viewModelResult} />
      );

      // 難易度情報がアクセシビリティラベルに含まれていることを確認
      const card = getByTestId('term-card-0');
      expect(card.props.accessibilityLabel).toContain('初級');
    });

    it('リトライボタンにアクセシビリティ属性が設定されている', () => {
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
      const { getByRole } = renderWithTheme(
        <TermsScreen viewModelResult={viewModelResult} />
      );

      // ボタンとしてのアクセシビリティが設定されていることを確認
      expect(getByRole('button')).toBeTruthy();
    });

    it('エラーメッセージがアクセシブルである', () => {
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
      const { getByLabelText } = renderWithTheme(
        <TermsScreen viewModelResult={viewModelResult} />
      );

      // エラーメッセージにアクセシビリティラベルが設定されていることを確認
      expect(getByLabelText(/エラー/)).toBeTruthy();
    });

    it('ローディング状態がアクセシブルである', () => {
      const viewModelResult = createMockViewModelResult({
        state: 'loading',
        loading: true,
        terms: null,
      });
      const { getByTestId } = renderWithTheme(
        <TermsScreen viewModelResult={viewModelResult} />
      );

      // ローディングインジケータが存在することを確認
      const loadingIndicator = getByTestId('loading-indicator');
      expect(loadingIndicator).toBeTruthy();
    });

    it('テキストに色が設定されている（テーマ対応）', () => {
      const viewModelResult = createMockViewModelResult();
      const { getByText } = renderWithTheme(
        <TermsScreen viewModelResult={viewModelResult} />
      );

      const descriptionText = getByText(mockTerms[0].description);
      const styles = descriptionText.props.style;

      // スタイルが配列の場合と単一の場合両方に対応
      const flattenedStyles = Array.isArray(styles)
        ? styles.reduce(
            (
              acc: Record<string, unknown>,
              style: Record<string, unknown>
            ) => ({ ...acc, ...style }),
            {}
          )
        : styles;

      // 色が設定されていることを確認
      expect(flattenedStyles.color).toBeTruthy();
    });

    it('ScrollViewが縦スクロール可能である', () => {
      const viewModelResult = createMockViewModelResult();
      const { getByTestId } = renderWithTheme(
        <TermsScreen viewModelResult={viewModelResult} />
      );

      const scrollView = getByTestId('terms-scroll-view');
      // ScrollViewの存在確認
      expect(scrollView).toBeTruthy();
      expect(scrollView.type).toBe('RCTScrollView');
    });

    it('スクロールインジケータが表示される', () => {
      const viewModelResult = createMockViewModelResult();
      const { getByTestId } = renderWithTheme(
        <TermsScreen viewModelResult={viewModelResult} />
      );

      const scrollView = getByTestId('terms-scroll-view');
      // showsVerticalScrollIndicator が true であることを確認
      expect(scrollView.props.showsVerticalScrollIndicator).toBe(true);
    });
  });
});
