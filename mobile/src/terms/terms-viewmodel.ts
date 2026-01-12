/**
 * Terms ViewModel
 * Task 22.1, 22.2, 22.3: 状態管理基盤、ローディング・エラー状態管理、リトライ機能
 *
 * MVVM パターンにおける ViewModel 層。
 * TermsRepository からデータを取得し、View に状態を提供します。
 *
 * Requirements:
 * - 5.1: 用語タブで3つ表示
 * - 5.3: 1日中同じ3用語表示
 * - 7.5: エラー時リトライオプション提供
 *
 * @see design.md - Architecture - Terms Feature
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { TermItem } from '../supabase/types';
import { TermsRepository, TermsError, createTermsRepository } from './terms-repository';

/**
 * 用語取得状態を表す型
 * - loading: データ取得中
 * - success: データ取得成功
 * - error: データ取得失敗
 */
export type TermsState = 'loading' | 'success' | 'error';

/**
 * useTermsViewModel の戻り値型
 * View が用語を表示するために必要な情報を提供
 */
export interface TermsViewModelResult {
  /** 現在の状態 */
  state: TermsState;
  /** ローディング中かどうか(state === 'loading' のショートカット) */
  loading: boolean;
  /** 用語リスト(未取得時はnull) */
  terms: TermItem[] | null;
  /** エラー情報(エラー時のみ) */
  error: TermsError | null;
  /** データを再取得する関数 */
  retry: () => Promise<void>;
}

/**
 * Terms ViewModel カスタムフック
 *
 * 依存性注入(DI)により、TermsRepositoryをパラメータで受け取ります。
 * これにより、テスト時にモックリポジトリを注入可能です。
 *
 * @param repository - TermsRepository(省略時はデフォルトを使用)
 * @returns TermsViewModelResult - 用語表示に必要な状態と関数
 *
 * @example
 * ```tsx
 * function TermsScreen() {
 *   const { loading, terms, error, retry } = useTermsViewModel();
 *
 *   if (loading) return <LoadingSpinner />;
 *   if (error) return <ErrorView message={error.message} onRetry={retry} />;
 *
 *   return (
 *     <View>
 *       {terms?.map((term, index) => (
 *         <TermCard key={index} term={term} />
 *       ))}
 *     </View>
 *   );
 * }
 * ```
 */
export function useTermsViewModel(
  repository?: TermsRepository
): TermsViewModelResult {
  // デフォルトのリポジトリを使用(テスト時はモックを注入)
  // useMemoでメモ化し、repositoryが変わらない限り同じインスタンスを再利用
  const repo = useMemo(
    () => repository || createTermsRepository(),
    [repository]
  );

  // 状態管理
  const [state, setState] = useState<TermsState>('loading');
  const [terms, setTerms] = useState<TermItem[] | null>(null);
  const [error, setError] = useState<TermsError | null>(null);

  /**
   * 用語を取得する内部関数
   * 初回マウント時とリトライ時に呼ばれる
   */
  const fetchTerms = useCallback(async () => {
    // ローディング状態に遷移
    setState('loading');
    setError(null);

    try {
      const result = await repo.getTodayTerms();

      if (result.success) {
        // 成功: 用語リストを保持(Requirement 5.1: 3つの用語)
        setTerms(result.data?.terms || null);
        setError(null);
        setState('success');
      } else {
        // 失敗: エラー状態に遷移
        setTerms(null);
        setError(result.error || null);
        setState('error');
      }
    } catch (unexpectedError) {
      // 予期しないエラー(通常は起こらないはず)
      console.error('[TermsViewModel] Unexpected error:', unexpectedError);
      setTerms(null);
      setError({
        code: 'UNKNOWN',
        message: '予期しないエラーが発生しました。しばらくしてからもう一度お試しください。',
        retryable: true,
      });
      setState('error');
    }
  }, [repo]);

  /**
   * リトライ関数
   * ユーザーが手動でデータを再取得する際に使用(Requirement 7.5)
   */
  const retry = useCallback(async () => {
    await fetchTerms();
  }, [fetchTerms]);

  // マウント時に用語を取得
  useEffect(() => {
    fetchTerms();
  }, [fetchTerms]);

  return {
    state,
    loading: state === 'loading',
    terms,
    error,
    retry,
  };
}
