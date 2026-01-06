/**
 * News Screen テスト
 * Task 19.1, 19.2, 19.3, 19.4: ニュース画面のUIコンポーネントテスト
 *
 * @see Requirements: 2.1, 2.2, 2.3, 7.5
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NewsScreen } from '../news-screen';
import { NewsViewModelResult } from '../news-viewmodel';
import { ThemeProvider } from '../../theme';

// テスト用のモックデータ
const mockWorldNews = {
  title: '世界経済ニュース',
  summary: '米国連邦準備制度理事会（FRB）は金利据え置きを発表しました。'.repeat(50), // 約2000文字相当
  updatedAt: '2024-01-07T09:00:00.000Z',
};

const mockJapanNews = {
  title: '日本経済ニュース',
  summary: '日経平均株価は3万円台を維持しています。'.repeat(60), // 約2000文字相当
  updatedAt: '2024-01-07T08:00:00.000Z',
};

// ViewModelのモック結果を生成するヘルパー関数
const createMockViewModelResult = (
  overrides: Partial<NewsViewModelResult> = {}
): NewsViewModelResult => ({
  state: 'success',
  loading: false,
  worldNews: mockWorldNews,
  japanNews: mockJapanNews,
  error: null,
  retry: jest.fn(),
  ...overrides,
});

// ThemeProviderでラップしてレンダリングするヘルパー
const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider>{component}</ThemeProvider>);
};

describe('NewsScreen', () => {
  describe('タスク19.1: ニュース画面基本レイアウト', () => {
    it('世界ニュースと日本ニュースの2カテゴリを表示する', () => {
      const viewModelResult = createMockViewModelResult();
      const { getByText } = renderWithTheme(
        <NewsScreen viewModelResult={viewModelResult} />
      );

      // 2カテゴリのヘッダーが表示されていることを確認
      expect(getByText('世界のニュース')).toBeTruthy();
      expect(getByText('日本のニュース')).toBeTruthy();
    });

    it('ニュースカードがスクロール可能なコンテナ内に表示される', () => {
      const viewModelResult = createMockViewModelResult();
      const { getByTestId } = renderWithTheme(
        <NewsScreen viewModelResult={viewModelResult} />
      );

      // スクロール可能なコンテナが存在することを確認
      expect(getByTestId('news-scroll-view')).toBeTruthy();
    });

    it('ニュースがない場合でもレイアウトがクラッシュしない', () => {
      const viewModelResult = createMockViewModelResult({
        worldNews: null,
        japanNews: null,
      });

      expect(() =>
        renderWithTheme(<NewsScreen viewModelResult={viewModelResult} />)
      ).not.toThrow();
    });
  });

  describe('タスク19.2: ニュースカードコンポーネント', () => {
    it('各カードにタイトルを表示する', () => {
      const viewModelResult = createMockViewModelResult();
      const { getByText } = renderWithTheme(
        <NewsScreen viewModelResult={viewModelResult} />
      );

      expect(getByText(mockWorldNews.title)).toBeTruthy();
      expect(getByText(mockJapanNews.title)).toBeTruthy();
    });

    it('各カードに要約本文を表示する', () => {
      const viewModelResult = createMockViewModelResult();
      const { getByText } = renderWithTheme(
        <NewsScreen viewModelResult={viewModelResult} />
      );

      // 要約本文の一部が表示されていることを確認
      expect(getByText(mockWorldNews.summary)).toBeTruthy();
      expect(getByText(mockJapanNews.summary)).toBeTruthy();
    });

    it('各カードに更新日時を表示する', () => {
      const viewModelResult = createMockViewModelResult();
      const { getAllByText } = renderWithTheme(
        <NewsScreen viewModelResult={viewModelResult} />
      );

      // 更新日時のフォーマットされた表示を確認（日本語フォーマット）
      // 2024/01/07 18:00 のような形式
      expect(getAllByText(/\d{4}\/\d{2}\/\d{2}/).length).toBeGreaterThan(0);
    });

    it('ニュースが null の場合、対応するカードは表示しない', () => {
      const viewModelResult = createMockViewModelResult({
        worldNews: null,
      });
      const { queryByText } = renderWithTheme(
        <NewsScreen viewModelResult={viewModelResult} />
      );

      // 世界のニュースは表示されない
      expect(queryByText(mockWorldNews.title)).toBeNull();
      // 日本のニュースは表示される
      expect(queryByText(mockJapanNews.title)).toBeTruthy();
    });
  });

  describe('タスク19.3: Newsローディング・エラー表示', () => {
    it('ローディング中はスピナーを表示する', () => {
      const viewModelResult = createMockViewModelResult({
        state: 'loading',
        loading: true,
        worldNews: null,
        japanNews: null,
      });
      const { getByTestId } = renderWithTheme(
        <NewsScreen viewModelResult={viewModelResult} />
      );

      expect(getByTestId('loading-indicator')).toBeTruthy();
    });

    it('ローディング中はニュースカードを表示しない', () => {
      const viewModelResult = createMockViewModelResult({
        state: 'loading',
        loading: true,
        worldNews: null,
        japanNews: null,
      });
      const { queryByText } = renderWithTheme(
        <NewsScreen viewModelResult={viewModelResult} />
      );

      expect(queryByText('世界のニュース')).toBeNull();
      expect(queryByText('日本のニュース')).toBeNull();
    });

    it('エラー時はエラーメッセージを表示する', () => {
      const viewModelResult = createMockViewModelResult({
        state: 'error',
        loading: false,
        worldNews: null,
        japanNews: null,
        error: {
          code: 'NETWORK_ERROR',
          message: 'ネットワークに接続できませんでした',
          retryable: true,
        },
      });
      const { getByText } = renderWithTheme(
        <NewsScreen viewModelResult={viewModelResult} />
      );

      expect(getByText('ネットワークに接続できませんでした')).toBeTruthy();
    });

    it('リトライ可能なエラー時はリトライボタンを表示する', () => {
      const mockRetry = jest.fn();
      const viewModelResult = createMockViewModelResult({
        state: 'error',
        loading: false,
        worldNews: null,
        japanNews: null,
        error: {
          code: 'NETWORK_ERROR',
          message: 'ネットワークに接続できませんでした',
          retryable: true,
        },
        retry: mockRetry,
      });
      const { getByText } = renderWithTheme(
        <NewsScreen viewModelResult={viewModelResult} />
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
        worldNews: null,
        japanNews: null,
        error: {
          code: 'UNKNOWN',
          message: '不明なエラーが発生しました',
          retryable: false,
        },
      });
      const { queryByText } = renderWithTheme(
        <NewsScreen viewModelResult={viewModelResult} />
      );

      expect(queryByText('再試行')).toBeNull();
    });
  });

  describe('タスク19.4: News iOSサイズ対応', () => {
    it('コンテンツがスクロール可能である', () => {
      const viewModelResult = createMockViewModelResult();
      const { getByTestId } = renderWithTheme(
        <NewsScreen viewModelResult={viewModelResult} />
      );

      const scrollView = getByTestId('news-scroll-view');
      // ScrollView が存在することを確認
      expect(scrollView.type).toBe('RCTScrollView');
    });

    it('レイアウトがflex: 1でコンテナいっぱいに広がる', () => {
      const viewModelResult = createMockViewModelResult();
      const { getByTestId } = renderWithTheme(
        <NewsScreen viewModelResult={viewModelResult} />
      );

      const container = getByTestId('news-container');
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
});
