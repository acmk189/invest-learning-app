/**
 * News ViewModel
 * Task 18.1, 18.2, 18.3: 状態管理基盤、ローディング・エラー状態管理、リトライ機能
 *
 * MVVM パターンにおける ViewModel 層。
 * NewsRepository からデータを取得し、View に状態を提供します。
 *
 * Requirements:
 * - 2.1: アプリ起動時当日ニュース表示
 * - 2.2: 世界・日本2カテゴリ表示
 * - 7.5: エラー時リトライオプション提供
 *
 * @see design.md - Architecture - News Feature
 */

import { useState, useEffect, useCallback } from 'react';
import { NewsItem } from '../firestore/types';
import { NewsRepository, NewsError, createNewsRepository } from './news-repository';

/**
 * ニュース取得状態を表す型
 * - loading: データ取得中
 * - success: データ取得成功
 * - error: データ取得失敗
 */
export type NewsState = 'loading' | 'success' | 'error';

/**
 * useNewsViewModel の戻り値型
 * View がニュースを表示するために必要な情報を提供
 */
export interface NewsViewModelResult {
  /** 現在の状態 */
  state: NewsState;
  /** ローディング中かどうか（state === 'loading' のショートカット） */
  loading: boolean;
  /** 世界のニュース（未取得時はnull） */
  worldNews: NewsItem | null;
  /** 日本のニュース（未取得時はnull） */
  japanNews: NewsItem | null;
  /** エラー情報（エラー時のみ） */
  error: NewsError | null;
  /** データを再取得する関数 */
  retry: () => Promise<void>;
}

/**
 * News ViewModel カスタムフック
 *
 * 依存性注入(DI)により、NewsRepositoryをパラメータで受け取ります。
 * これにより、テスト時にモックリポジトリを注入可能です。
 *
 * @param repository - NewsRepository（省略時はデフォルトを使用）
 * @returns NewsViewModelResult - ニュース表示に必要な状態と関数
 *
 * @example
 * ```tsx
 * function NewsScreen() {
 *   const { loading, worldNews, japanNews, error, retry } = useNewsViewModel();
 *
 *   if (loading) return <LoadingSpinner />;
 *   if (error) return <ErrorView message={error.message} onRetry={retry} />;
 *
 *   return (
 *     <View>
 *       <NewsCard news={worldNews} title="世界のニュース" />
 *       <NewsCard news={japanNews} title="日本のニュース" />
 *     </View>
 *   );
 * }
 * ```
 */
export function useNewsViewModel(
  repository?: NewsRepository
): NewsViewModelResult {
  // デフォルトのリポジトリを使用（テスト時はモックを注入）
  const repo = repository || createNewsRepository();

  // 状態管理
  const [state, setState] = useState<NewsState>('loading');
  const [worldNews, setWorldNews] = useState<NewsItem | null>(null);
  const [japanNews, setJapanNews] = useState<NewsItem | null>(null);
  const [error, setError] = useState<NewsError | null>(null);

  /**
   * ニュースを取得する内部関数
   * 初回マウント時とリトライ時に呼ばれる
   */
  const fetchNews = useCallback(async () => {
    // ローディング状態に遷移
    setState('loading');
    setError(null);

    try {
      const result = await repo.getTodayNews();

      if (result.success) {
        // 成功: 世界・日本ニュースを分離して保持（Requirement 2.2）
        setWorldNews(result.data?.worldNews || null);
        setJapanNews(result.data?.japanNews || null);
        setError(null);
        setState('success');
      } else {
        // 失敗: エラー状態に遷移
        setWorldNews(null);
        setJapanNews(null);
        setError(result.error || null);
        setState('error');
      }
    } catch (unexpectedError) {
      // 予期しないエラー（通常は起こらないはず）
      console.error('[NewsViewModel] Unexpected error:', unexpectedError);
      setWorldNews(null);
      setJapanNews(null);
      setError({
        code: 'unknown_error',
        message: '予期しないエラーが発生しました',
        retryable: true,
      });
      setState('error');
    }
  }, [repo]);

  /**
   * リトライ関数
   * ユーザーが手動でデータを再取得する際に使用（Requirement 7.5）
   */
  const retry = useCallback(async () => {
    await fetchNews();
  }, [fetchNews]);

  // マウント時にニュースを取得（Requirement 2.1: アプリ起動時）
  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  return {
    state,
    loading: state === 'loading',
    worldNews,
    japanNews,
    error,
    retry,
  };
}
